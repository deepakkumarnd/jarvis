# GET /up - health check for load balancers (Kamal) and the dashboard.
#
# Responds 200 when the app and database are healthy, 503 otherwise. In development
# and test the response includes host metrics (CPU, memory, disk, network, process).
# In production metrics are only included when the request carries the token from
# HEALTH_METRICS_TOKEN (X-Health-Token header), so host details aren't public.
class HealthController < ApplicationController
  def show
    database = database_check
    healthy = database[:status] == "ok"

    body = { status: healthy ? "ok" : "error", time: Time.current.iso8601(3), checks: { database: database } }
    body[:metrics] = SystemMetrics.collect if include_metrics?

    render json: body, status: healthy ? :ok : :service_unavailable
  end

  private
    def database_check
      started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      ActiveRecord::Base.connection.select_value("SELECT 1")
      { status: "ok", latency_ms: ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000).round(2) }
    rescue StandardError => e
      { status: "error", error: e.class.name }
    end

    def include_metrics?
      return true if Rails.env.local?

      token = ENV["HEALTH_METRICS_TOKEN"]
      token.present? && ActiveSupport::SecurityUtils.secure_compare(request.headers["X-Health-Token"].to_s, token)
    end
end
