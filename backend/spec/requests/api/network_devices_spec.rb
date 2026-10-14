require "rails_helper"

RSpec.describe "Api::NetworkDevices", type: :request do
  def json = response.parsed_body

  let(:scan) do
    {
      scanned_at: "2026-10-14T06:49:44Z",
      duration_ms: 2500,
      networks: [ { interface: "wlp4s0", address: "192.168.1.48", cidr: "192.168.1.0/24", ssid: "LEELAS-5G" } ],
      devices: [ { ip: "192.168.1.1", mac: "b4:3d:08:86:e2:00", hostname: nil, vendor: nil, interface: "wlp4s0", randomized: false, gateway: true, self: false } ]
    }
  end

  it "returns the devices found on the network" do
    allow(NetworkScanner).to receive(:scan).with(force: false).and_return(scan)

    get api_network_devices_path, as: :json

    expect(response).to have_http_status(:ok)
    expect(json["networks"].first["cidr"]).to eq("192.168.1.0/24")
    expect(json["devices"].first).to include("ip" => "192.168.1.1", "gateway" => true)
  end

  it "forces a fresh scan when refresh is given" do
    allow(NetworkScanner).to receive(:scan).with(force: true).and_return(scan)

    get api_network_devices_path(refresh: 1), as: :json

    expect(response).to have_http_status(:ok)
    expect(NetworkScanner).to have_received(:scan).with(force: true)
  end

  it "reports a failed scan" do
    allow(NetworkScanner).to receive(:scan).and_raise(Errno::EACCES)

    get api_network_devices_path, as: :json

    expect(response).to have_http_status(:service_unavailable)
    expect(json).to include("devices" => [], "error" => "Network scan failed (Errno::EACCES)")
  end

  it "requires sign-in", signed_out: true do
    get api_network_devices_path, as: :json

    expect(response).to have_http_status(:unauthorized)
  end
end
