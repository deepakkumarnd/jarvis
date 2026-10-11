require "rails_helper"

RSpec.describe "Health check", type: :request do
  let(:json) { response.parsed_body }
  let(:metrics) { { "cpu" => { "usage_percent" => 12.5 } } }

  before { allow(SystemMetrics).to receive(:collect).and_return(metrics) }

  it "returns ok with database status and system metrics" do
    get "/up"

    expect(response).to have_http_status(:ok)
    expect(json).to include("status" => "ok", "metrics" => metrics)
    expect(json.dig("checks", "database", "status")).to eq("ok")
  end

  it "returns 503 when the database is unavailable" do
    allow(ActiveRecord::Base).to receive(:connection).and_raise(ActiveRecord::ConnectionNotEstablished)

    get "/up"

    expect(response).to have_http_status(:service_unavailable)
    expect(json["status"]).to eq("error")
    expect(json.dig("checks", "database")).to eq("status" => "error", "error" => "ActiveRecord::ConnectionNotEstablished")
  end

  context "in production" do
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::EnvironmentInquirer.new("production"))
      stub_const("ENV", ENV.to_h.merge("HEALTH_METRICS_TOKEN" => "s3cret"))
    end

    it "omits metrics without the token" do
      get "/up"

      expect(response).to have_http_status(:ok)
      expect(json).not_to have_key("metrics")
    end

    it "omits metrics with a wrong token" do
      get "/up", headers: { "X-Health-Token" => "nope" }

      expect(json).not_to have_key("metrics")
    end

    it "includes metrics with the right token" do
      get "/up", headers: { "X-Health-Token" => "s3cret" }

      expect(json["metrics"]).to eq(metrics)
    end
  end
end
