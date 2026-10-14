require "etc"
require "open3"
require "socket"

# Collects host and process metrics for the health endpoint.
#
# Linux only: values come from /proc and /sys. On other platforms (or when a source
# is unreadable) the affected section is nil rather than raising. Parsers take raw
# text so they can be tested without a real /proc.
class SystemMetrics
  SECTOR_BYTES = 512
  CPU_SAMPLE_SECONDS = 0.1
  VIRTUAL_BLOCK_DEVICES = /\A(loop|ram|zram)\d*/

  def self.collect = new.collect

  def collect
    {
      host: section { host },
      cpu: section { cpu },
      memory: section { memory },
      disk: section { disk },
      network: section { network },
      process: section { process_info }
    }
  end

  def host
    os_release = read("/etc/os-release").to_s[/^PRETTY_NAME="?([^"\n]+)"?/, 1]
    uname = Etc.uname
    uptime = read("/proc/uptime").to_f

    {
      hostname: Socket.gethostname,
      os: os_release || uname[:sysname],
      kernel: uname[:release],
      architecture: uname[:machine],
      uptime_seconds: uptime.round,
      booted_at: (Time.current - uptime).iso8601
    }
  end

  def cpu
    before = self.class.parse_cpu_stat(read!("/proc/stat"))
    sleep CPU_SAMPLE_SECONDS
    after = self.class.parse_cpu_stat(read!("/proc/stat"))
    load1, load5, load15 = read!("/proc/loadavg").split.first(3).map(&:to_f)
    info = self.class.parse_cpuinfo(read("/proc/cpuinfo").to_s)

    {
      model: info[:model],
      logical_cores: Etc.nprocessors,
      physical_cores: info[:physical_cores],
      sockets: info[:sockets],
      mhz: info[:mhz],
      usage_percent: self.class.cpu_usage_percent(before[:total], after[:total]),
      per_core_usage_percent: after[:cores].each_with_index.map { |core, i| self.class.cpu_usage_percent(before[:cores][i], core) },
      load_average: { "1m" => load1, "5m" => load5, "15m" => load15 }
    }
  end

  def memory
    info = self.class.parse_meminfo(read!("/proc/meminfo"))
    total = info.fetch("MemTotal")
    available = info.fetch("MemAvailable") { info["MemFree"] + info["Buffers"].to_i + info["Cached"].to_i }
    swap_total = info["SwapTotal"].to_i
    swap_free = info["SwapFree"].to_i

    {
      total_bytes: total,
      free_bytes: info["MemFree"],
      available_bytes: available,
      used_bytes: total - available,
      buffers_bytes: info["Buffers"],
      cached_bytes: info["Cached"],
      used_percent: percent(total - available, total),
      swap: { total_bytes: swap_total, free_bytes: swap_free, used_bytes: swap_total - swap_free, used_percent: percent(swap_total - swap_free, swap_total) }
    }
  end

  def disk
    filesystems = [ "/", Rails.root.to_s ].filter_map { |path| filesystem_usage(path) }.uniq { |fs| fs[:filesystem] }
    devices = self.class.parse_diskstats(read!("/proc/diskstats"))
      .select { |d| File.directory?("/sys/block/#{d[:name]}") && !d[:name].match?(VIRTUAL_BLOCK_DEVICES) }

    { filesystems: filesystems, devices: devices }
  end

  def network
    addresses = Socket.getifaddrs.each_with_object(Hash.new { |h, k| h[k] = [] }) do |ifaddr, map|
      addr = ifaddr.addr
      next unless addr&.ip?

      map[ifaddr.name] << { family: addr.ipv4? ? "ipv4" : "ipv6", address: addr.ip_address.sub(/%.*\z/, "") }
    end

    self.class.parse_net_dev(read!("/proc/net/dev")).map do |iface|
      sys = "/sys/class/net/#{iface[:name]}"
      iface.merge(
        state: read("#{sys}/operstate")&.strip,
        mac: read("#{sys}/address")&.strip,
        mtu: read("#{sys}/mtu")&.to_i,
        speed_mbps: read("#{sys}/speed")&.to_i&.then { |s| s.positive? ? s : nil },
        loopback: iface[:name] == "lo",
        virtual: self.class.virtual_interface?(iface[:name]),
        addresses: addresses[iface[:name]]
      )
    end
  end

  def process_info
    status = self.class.parse_proc_status(read("/proc/self/status").to_s)
    start_ticks = read("/proc/self/stat").to_s.split(") ").last.to_s.split[19].to_i
    process_uptime = read("/proc/uptime").to_f - start_ticks.fdiv(Etc.sysconf(Etc::SC_CLK_TCK))

    {
      pid: Process.pid,
      ruby_version: RUBY_VERSION,
      rails_version: Rails.version,
      environment: Rails.env,
      rss_bytes: status["VmRSS"],
      threads: status["Threads"],
      uptime_seconds: process_uptime.positive? ? process_uptime.round : nil,
      cpu_time_seconds: Process.clock_gettime(Process::CLOCK_PROCESS_CPUTIME_ID).round(2)
    }
  end

  # --- Parsers -------------------------------------------------------------

  # /proc/stat -> { total: [user, nice, system, idle, iowait, irq, softirq, steal], cores: [[...], ...] }
  def self.parse_cpu_stat(text)
    rows = text.lines.grep(/\Acpu\d*\s/).map { |line| line.split.drop(1).first(8).map(&:to_i) }
    { total: rows.first, cores: rows.drop(1) }
  end

  def self.cpu_usage_percent(before, after)
    deltas = after.zip(before).map { |a, b| a - b }
    total = deltas.sum
    idle = deltas[3] + deltas[4].to_i # idle + iowait
    total.positive? ? ((total - idle) * 100.0 / total).round(1) : 0.0
  end

  def self.parse_cpuinfo(text)
    blocks = text.split(/\n\n+/).map { |block| block.lines.to_h { |l| l.split(":", 2).map(&:strip) } }
    physical = blocks.map { |b| [ b["physical id"], b["core id"] ] }.uniq.size
    {
      model: blocks.first&.[]("model name"),
      mhz: blocks.first&.[]("cpu MHz")&.to_f&.round,
      sockets: blocks.map { |b| b["physical id"] }.compact.uniq.size.nonzero? || 1,
      physical_cores: blocks.any? { |b| b["core id"] } ? physical : nil
    }
  end

  # /proc/meminfo -> { "MemTotal" => bytes, ... }
  def self.parse_meminfo(text)
    text.lines.to_h do |line|
      key, value = line.split(":", 2)
      amount, unit = value.split
      [ key, unit == "kB" ? amount.to_i * 1024 : amount.to_i ]
    end
  end

  def self.parse_diskstats(text)
    text.lines.map do |line|
      f = line.split
      {
        name: f[2],
        reads: f[3].to_i,
        read_bytes: f[5].to_i * SECTOR_BYTES,
        writes: f[7].to_i,
        written_bytes: f[9].to_i * SECTOR_BYTES,
        io_in_progress: f[11].to_i,
        io_time_ms: f[12].to_i
      }
    end
  end

  def self.parse_net_dev(text)
    text.lines.drop(2).map do |line|
      name, stats = line.split(":", 2)
      s = stats.split.map(&:to_i)
      {
        name: name.strip,
        rx_bytes: s[0], rx_packets: s[1], rx_errors: s[2], rx_dropped: s[3],
        tx_bytes: s[8], tx_packets: s[9], tx_errors: s[10], tx_dropped: s[11]
      }
    end
  end

  def self.parse_df(text)
    filesystem, blocks, used, available, _capacity, mount = text.lines.last.split
    total = blocks.to_i * 1024
    { filesystem: filesystem, mount: mount, total_bytes: total, used_bytes: used.to_i * 1024, free_bytes: available.to_i * 1024,
      used_percent: total.positive? ? (used.to_f * 100 / (used.to_i + available.to_i)).round(1) : 0.0 }
  end

  # Bridges, veth pairs, tunnels etc. live under /sys/devices/virtual
  def self.virtual_interface?(name)
    File.realpath("/sys/class/net/#{name}").include?("/devices/virtual/")
  rescue SystemCallError
    false
  end

  def self.parse_proc_status(text)
    parse_meminfo(text.lines.grep(/\A(VmRSS|Threads):/).join)
  end

  private
    # Isolates each section so one unreadable source doesn't fail the whole report
    def section
      yield
    rescue StandardError => e
      Rails.logger.warn("[SystemMetrics] #{e.class}: #{e.message}")
      nil
    end

    def filesystem_usage(path)
      output, status = Open3.capture2("df", "-Pk", path)
      self.class.parse_df(output) if status.success?
    end

    def read(path)
      File.read(path)
    rescue SystemCallError
      nil
    end

    def read!(path) = File.read(path)

    def percent(part, total)
      total.to_i.positive? ? (part * 100.0 / total).round(1) : 0.0
    end
end
