require "ipaddr"
require "open3"
require "resolv"
require "socket"

# Finds the devices on the local network(s) without root or raw sockets.
#
# Sends one empty UDP datagram to every address on each physical IPv4 LAN. Before the
# kernel can send it, it must ARP for the destination, so every awake device answers
# and lands in the neighbour table, which is then read from /proc/net/arp. Hostnames
# come from reverse DNS (home routers usually serve their DHCP names) and vendors from
# the IEEE OUI list when the ieee-data package is installed.
#
# Linux only. Parsers take raw text so they can be tested without a real /proc.
class NetworkScanner
  SWEEP_PORT = 9 # discard
  SWEEP_WAIT_SECONDS = 1.5
  SWEEP_BATCH = 128 # addresses per socket
  MIN_PREFIX = 22 # never sweep more than 1022 hosts per network
  CACHE_TTL = 30.seconds
  DNS_TIMEOUT_SECONDS = 0.5 # LAN resolvers answer in milliseconds
  DNS_CONCURRENCY = 16
  OUI_PATH = "/usr/share/ieee-data/oui.txt".freeze
  ATF_COMPLETE = 0x2
  SWEEP_ERRORS = [ Errno::EHOSTUNREACH, Errno::ENETUNREACH, Errno::ECONNREFUSED, Errno::ENOBUFS, Errno::EPERM ].freeze

  LOCK = Mutex.new

  # Serialised so concurrent requests never run overlapping sweeps; they wait and share the cached result.
  def self.scan(force: false)
    LOCK.synchronize do
      Rails.cache.delete("network_scan") if force
      Rails.cache.fetch("network_scan", expires_in: CACHE_TTL) { new.scan }
    end
  end

  def scan
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    networks = lan_networks
    sweep(networks)

    gateways = self.class.parse_default_gateways(read("/proc/net/route").to_s)
    neighbours = self.class.parse_arp(read("/proc/net/arp").to_s).select do |entry|
      networks.any? { |net| net[:interface] == entry[:interface] && net[:range].include?(entry[:ip]) }
    end
    own = networks.filter_map do |net|
      mac = read("/sys/class/net/#{net[:interface]}/address")&.strip
      { ip: net[:address], mac: mac, interface: net[:interface], self: true } if mac
    end

    devices = (own + neighbours).uniq { |d| d[:ip] }.sort_by { |d| IPAddr.new(d[:ip]).to_i }
    hostnames = reverse_lookup(devices.map { |d| d[:ip] })
    ssids = wifi_ssids

    {
      scanned_at: Time.current.iso8601,
      duration_ms: ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000).round,
      networks: networks.map { |net| net.slice(:interface, :address, :cidr).merge(ssid: ssids[net[:interface]]) },
      devices: devices.map do |d|
        {
          ip: d[:ip],
          mac: d[:mac],
          hostname: d[:self] ? Socket.gethostname : hostnames[d[:ip]],
          vendor: self.class.vendor_for(d[:mac]),
          interface: d[:interface],
          randomized: self.class.randomized_mac?(d[:mac]),
          gateway: gateways.include?(d[:ip]),
          self: d[:self] == true
        }
      end
    }
  end

  # Up, physical (not loopback, Docker bridge, veth, VPN tunnel) IPv4 networks small enough to sweep
  def lan_networks
    Socket.getifaddrs.filter_map do |ifaddr|
      addr = ifaddr.addr
      next unless addr&.ipv4? && !addr.ipv4_loopback? && ifaddr.netmask
      next if SystemMetrics.virtual_interface?(ifaddr.name)
      next unless read("/sys/class/net/#{ifaddr.name}/operstate")&.strip == "up"

      self.class.network_for(ifaddr.name, addr.ip_address, ifaddr.netmask.ip_address)
    end
  end

  def sweep(networks)
    return if networks.empty?

    targets = networks.flat_map { |net| self.class.host_addresses(net[:range]) - [ net[:address] ] }
    # Datagrams waiting on ARP count against the sending socket's buffer (~224 fit in the
    # default), so spread them over several sockets and never block on a full one.
    sockets = targets.each_slice(SWEEP_BATCH).map do |batch|
      UDPSocket.new.tap do |socket|
        batch.each do |ip|
          socket.sendmsg_nonblock("", 0, Socket.sockaddr_in(SWEEP_PORT, ip), exception: false)
        rescue *SWEEP_ERRORS
          # Unreachable; ARP has already been attempted either way
        end
      end
    end
    sleep SWEEP_WAIT_SECONDS
  ensure
    sockets&.each(&:close)
  end

  # --- Parsers and helpers -------------------------------------------------

  # Returns nil when the subnet is too large to sweep
  def self.network_for(interface, address, netmask)
    range = IPAddr.new("#{address}/#{netmask}")
    return if range.prefix < MIN_PREFIX

    { interface: interface, address: address, cidr: "#{range}/#{range.prefix}", range: range }
  end

  # Every address in the subnet except the network and broadcast addresses
  def self.host_addresses(range)
    first = range.to_i
    last = range.to_range.last.to_i
    ((first + 1)...last).map { |n| IPAddr.new(n, Socket::AF_INET).to_s }
  end

  # /proc/net/arp -> [{ ip:, mac:, interface: }] for resolved entries only
  def self.parse_arp(text)
    text.lines.drop(1).filter_map do |line|
      ip, _type, flags, mac, _mask, interface = line.split
      next unless interface && flags.to_i(16).anybits?(ATF_COMPLETE)
      next if mac == "00:00:00:00:00:00"

      { ip: ip, mac: mac.downcase, interface: interface }
    end
  end

  # /proc/net/route -> gateway IPs of default routes (addresses are little-endian hex)
  def self.parse_default_gateways(text)
    text.lines.drop(1).filter_map do |line|
      _iface, destination, gateway = line.split
      next unless destination == "00000000" && gateway && gateway != "00000000"

      [ gateway.to_i(16) ].pack("V").unpack("C4").join(".")
    end.uniq
  end

  # Locally administered MACs (second-lowest bit of the first octet), e.g. phones' private Wi-Fi addresses
  def self.randomized_mac?(mac)
    mac.to_s[0, 2].to_i(16).anybits?(0x02)
  end

  def self.vendor_for(mac)
    return if mac.blank? || randomized_mac?(mac)

    oui_table[mac.delete(":-").upcase[0, 6]]
  end

  # "00-00-0C   (hex)\t\tCisco Systems, Inc" -> { "00000C" => "Cisco Systems, Inc" }
  def self.parse_oui(text)
    text.each_line.with_object({}) do |line, table|
      match = line.match(/\A([0-9A-F]{2})-([0-9A-F]{2})-([0-9A-F]{2})\s+\(hex\)\s+(.+?)\s*\z/i)
      table[match.captures.first(3).join.upcase] = match[4] if match
    end
  end

  def self.oui_table
    @oui_table ||= File.exist?(OUI_PATH) ? parse_oui(File.read(OUI_PATH)) : {}
  rescue SystemCallError
    @oui_table = {}
  end

  # `nmcli -t -f ACTIVE,SSID,DEVICE device wifi list` -> { "wlp4s0" => "Home Wi-Fi" } for connected
  # networks. Terse output escapes ":" and "\\" inside fields with a backslash.
  def self.parse_nmcli_wifi(text)
    text.each_line.with_object({}) do |line, ssids|
      active, ssid, device = line.chomp.split(/(?<!\\):/).map { |field| field.gsub(/\\(.)/, '\\1') }
      ssids[device] = ssid if active == "yes" && device.present? && ssid.present?
    end
  end

  # "phone.bbrouter" -> "phone" for the resolver's search domains
  def self.strip_search_domains(name, domains)
    domain = domains.find { |d| name.end_with?(".#{d}") }
    domain ? name.delete_suffix(".#{domain}") : name
  end

  private
    # { ip => hostname or nil }, a batch at a time: the router's DNS first, then multicast DNS
    # (answered by Apple devices, many Android/smart-home devices and Linux with Avahi)
    def reverse_lookup(ips)
      domains = search_domains + [ "local" ]
      ips.each_slice(DNS_CONCURRENCY).flat_map do |batch|
        batch.map do |ip|
          Thread.new do
            name = lookup_name(Resolv::DNS, ip) || lookup_name(Resolv::MDNS, ip)
            [ ip, name && self.class.strip_search_domains(name, domains) ]
          end
        end.map(&:value)
      end.to_h
    end

    def lookup_name(resolver_class, ip)
      resolver = resolver_class.new
      resolver.timeouts = DNS_TIMEOUT_SECONDS
      resolver.getname(ip).to_s.presence
    rescue Resolv::ResolvError, SocketError, SystemCallError
      nil
    ensure
      resolver&.close
    end

    # Wi-Fi network names from NetworkManager (no root needed); empty without nmcli or on wired-only hosts
    def wifi_ssids
      output, status = Open3.capture2("nmcli", "-t", "-f", "ACTIVE,SSID,DEVICE", "device", "wifi", "list", "--rescan", "no")
      status.success? ? self.class.parse_nmcli_wifi(output) : {}
    rescue SystemCallError
      {}
    end

    def search_domains
      read("/etc/resolv.conf").to_s.scan(/^\s*(?:search|domain)\s+(.+)$/).flatten.flat_map(&:split).uniq
    end

    def read(path)
      File.read(path)
    rescue SystemCallError
      nil
    end
end
