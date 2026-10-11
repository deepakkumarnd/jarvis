require "rails_helper"

RSpec.describe SystemMetrics do
  describe ".parse_cpu_stat and .cpu_usage_percent" do
    let(:before) { described_class.parse_cpu_stat(<<~STAT) }
      cpu  100 0 100 700 100 0 0 0 0 0
      cpu0 50 0 50 350 50 0 0 0 0 0
      cpu1 50 0 50 350 50 0 0 0 0 0
      intr 12345
    STAT
    let(:after) { described_class.parse_cpu_stat(<<~STAT) }
      cpu  200 0 200 1300 100 0 0 0 0 0
      cpu0 150 0 50 350 50 0 0 0 0 0
      cpu1 50 0 150 950 50 0 0 0 0 0
    STAT

    it "splits the total and per-core rows" do
      expect(before[:total]).to eq([ 100, 0, 100, 700, 100, 0, 0, 0 ])
      expect(before[:cores].size).to eq(2)
    end

    it "computes busy time as a percentage of elapsed time" do
      expect(described_class.cpu_usage_percent(before[:total], after[:total])).to eq(25.0)
      expect(described_class.cpu_usage_percent(before[:cores][0], after[:cores][0])).to eq(100.0)
      expect(described_class.cpu_usage_percent(before[:cores][1], after[:cores][1])).to eq(14.3)
    end

    it "returns 0 when no time has elapsed" do
      expect(described_class.cpu_usage_percent(before[:total], before[:total])).to eq(0.0)
    end
  end

  describe ".parse_cpuinfo" do
    it "reads the model and counts physical cores and sockets" do
      cpuinfo = 4.times.map { |i| "processor\t: #{i}\nmodel name\t: Test CPU\ncpu MHz\t\t: 3600.123\nphysical id\t: 0\ncore id\t\t: #{i % 2}\n" }.join("\n")

      expect(described_class.parse_cpuinfo(cpuinfo)).to eq(model: "Test CPU", mhz: 3600, sockets: 1, physical_cores: 2)
    end
  end

  describe ".parse_meminfo" do
    it "converts kB values to bytes" do
      info = described_class.parse_meminfo("MemTotal:       16000 kB\nMemAvailable:    4000 kB\nHugePages_Total:       0\n")

      expect(info).to eq("MemTotal" => 16_384_000, "MemAvailable" => 4_096_000, "HugePages_Total" => 0)
    end
  end

  describe ".parse_diskstats" do
    it "reads operation counts and converts sectors to bytes" do
      line = " 259       0 nvme0n1 100 5 2000 50 200 10 4000 80 1 300 400 0 0 0 0\n"

      expect(described_class.parse_diskstats(line).first).to eq(
        name: "nvme0n1", reads: 100, read_bytes: 2000 * 512, writes: 200, written_bytes: 4000 * 512,
        io_in_progress: 1, io_time_ms: 300
      )
    end
  end

  describe ".parse_net_dev" do
    it "reads receive and transmit counters per interface" do
      text = <<~NET
        Inter-|   Receive                                                |  Transmit
         face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
          eth0: 1000 10 1 2 0 0 0 0 2000 20 3 4 0 0 0 0
      NET

      expect(described_class.parse_net_dev(text)).to eq([
        { name: "eth0", rx_bytes: 1000, rx_packets: 10, rx_errors: 1, rx_dropped: 2, tx_bytes: 2000, tx_packets: 20, tx_errors: 3, tx_dropped: 4 }
      ])
    end
  end

  describe ".parse_df" do
    it "reads usage for the filesystem" do
      text = "Filesystem     1024-blocks      Used Available Capacity Mounted on\n/dev/sda1           1000       250       750      25% /\n"

      expect(described_class.parse_df(text)).to eq(
        filesystem: "/dev/sda1", mount: "/", total_bytes: 1_024_000, used_bytes: 256_000, free_bytes: 768_000, used_percent: 25.0
      )
    end
  end

  describe "#collect", if: File.exist?("/proc/stat") do
    it "returns every section on Linux" do
      metrics = described_class.collect

      expect(metrics.keys).to contain_exactly(:host, :cpu, :memory, :disk, :network, :process)
      expect(metrics[:cpu]).to include(:model, :logical_cores, :usage_percent, :load_average)
      expect(metrics[:cpu][:logical_cores]).to eq(Etc.nprocessors)
      expect(metrics[:memory][:total_bytes]).to be > metrics[:memory][:available_bytes]
      expect(metrics[:network]).to include(a_hash_including(name: "lo", loopback: true))
      expect(metrics[:process]).to include(pid: Process.pid, ruby_version: RUBY_VERSION)
    end

    it "returns nil for a section that fails instead of raising" do
      metrics = described_class.new
      allow(metrics).to receive(:memory).and_raise(Errno::ENOENT)

      expect(metrics.collect[:memory]).to be_nil
    end
  end
end
