require "rails_helper"

RSpec.describe NetworkScanner do
  describe ".parse_arp" do
    let(:arp) { <<~ARP }
      IP address       HW type     Flags       HW address            Mask     Device
      192.168.1.1      0x1         0x2         B4:3D:08:86:E2:00     *        wlp4s0
      192.168.1.7      0x1         0x0         00:00:00:00:00:00     *        wlp4s0
      192.168.1.9      0x1         0x6         d8:80:83:34:39:a7     *        wlp4s0
      172.18.0.8       0x1         0x2         16:dd:00:3e:56:7a     *        br-b021ec22dbd2
    ARP

    it "keeps resolved entries with lower-cased MACs and drops incomplete ones" do
      expect(described_class.parse_arp(arp)).to eq([
        { ip: "192.168.1.1", mac: "b4:3d:08:86:e2:00", interface: "wlp4s0" },
        { ip: "192.168.1.9", mac: "d8:80:83:34:39:a7", interface: "wlp4s0" },
        { ip: "172.18.0.8", mac: "16:dd:00:3e:56:7a", interface: "br-b021ec22dbd2" }
      ])
    end

    it "returns nothing for an empty table" do
      expect(described_class.parse_arp("")).to eq([])
    end
  end

  describe ".parse_default_gateways" do
    it "decodes the little-endian gateway of default routes" do
      route = <<~ROUTE
        Iface	Destination	Gateway 	Flags	RefCnt	Use	Metric	Mask		MTU	Window	IRTT
        wlp4s0	00000000	0101A8C0	0003	0	0	600	00000000	0	0	0
        wlp4s0	0001A8C0	00000000	0001	0	0	600	00FFFFFF	0	0	0
        docker0	000011AC	00000000	0001	0	0	0	0000FFFF	0	0	0
      ROUTE

      expect(described_class.parse_default_gateways(route)).to eq([ "192.168.1.1" ])
    end
  end

  describe ".network_for and .host_addresses" do
    it "describes the subnet an address belongs to" do
      network = described_class.network_for("wlp4s0", "192.168.1.48", "255.255.255.0")

      expect(network).to include(interface: "wlp4s0", address: "192.168.1.48", cidr: "192.168.1.0/24")
    end

    it "lists every host address, excluding network and broadcast" do
      hosts = described_class.host_addresses(IPAddr.new("192.168.1.0/24"))

      expect(hosts.size).to eq(254)
      expect(hosts.values_at(0, -1)).to eq([ "192.168.1.1", "192.168.1.254" ])
    end

    it "refuses subnets too large to sweep" do
      expect(described_class.network_for("eth0", "10.0.0.5", "255.255.252.0")).to be_present
      expect(described_class.network_for("eth0", "10.0.0.5", "255.255.0.0")).to be_nil
    end
  end

  describe ".randomized_mac?" do
    it "detects locally administered (private) addresses" do
      expect(described_class.randomized_mac?("aa:a1:e9:ab:f7:c9")).to be(true)
      expect(described_class.randomized_mac?("16:dd:00:3e:56:7a")).to be(true)
      expect(described_class.randomized_mac?("b4:3d:08:86:e2:00")).to be(false)
    end
  end

  describe ".parse_oui" do
    it "maps OUI prefixes to vendor names" do
      oui = <<~OUI
        OUI/MA-L                                                    Organization
        company_id                                                  Organization
                                                                    Address

        00-00-0C   (hex)\t\tCisco Systems, Inc
        00000C     (base 16)\t\tCisco Systems, Inc
      OUI

      expect(described_class.parse_oui(oui)).to eq("00000C" => "Cisco Systems, Inc")
    end
  end

  describe ".vendor_for" do
    before { allow(described_class).to receive(:oui_table).and_return("B43D08" => "Example Networks") }

    it "looks up the first three octets" do
      expect(described_class.vendor_for("b4:3d:08:86:e2:00")).to eq("Example Networks")
    end

    it "skips private MACs, which have no registered vendor" do
      expect(described_class.vendor_for("b6:3d:08:86:e2:00")).to be_nil
    end
  end

  describe ".parse_nmcli_wifi" do
    it "maps each interface to the SSID it's connected to" do
      output = <<~'NMCLI'
        yes:LEELAS-5G:wlp4s0
        no:LEELAS:wlp4s0
        yes:Cafe\:Guest:wlan1
        no::wlp4s0
      NMCLI

      expect(described_class.parse_nmcli_wifi(output)).to eq("wlp4s0" => "LEELAS-5G", "wlan1" => "Cafe:Guest")
    end
  end

  describe ".strip_search_domains" do
    it "removes a matching search or mDNS domain" do
      expect(described_class.strip_search_domains("phone.bbrouter", %w[bbrouter local])).to eq("phone")
      expect(described_class.strip_search_domains("MacBook.local", %w[bbrouter local])).to eq("MacBook")
      expect(described_class.strip_search_domains("nas.example.com", %w[bbrouter local])).to eq("nas.example.com")
    end
  end
end
