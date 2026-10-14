class Api::NetworkDevicesController < ApplicationController
  # GET /api/network_devices(?refresh=1)
  # Devices currently on the LAN; results are cached briefly unless refresh is given.
  def index
    render json: NetworkScanner.scan(force: params[:refresh].present?)
  rescue StandardError => e
    Rails.logger.warn("[NetworkScanner] #{e.class}: #{e.message}")
    render json: { devices: [], networks: [], error: "Network scan failed (#{e.class.name})" }, status: :service_unavailable
  end
end
