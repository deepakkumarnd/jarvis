require "rails_helper"

RSpec.describe "Api::Settings", type: :request do
  def json = response.parsed_body

  it "returns the current settings" do
    get api_settings_path, as: :json

    expect(response).to have_http_status(:ok)
    expect(json).to include("brand_name" => "Jarvis", "tagline" => "Personal assistant for Deepak")
    expect(json.keys).to contain_exactly("brand_name", "tagline", "updated_at")
  end

  it "updates the brand name and tagline" do
    patch api_settings_path, params: { setting: { brand_name: "Friday", tagline: "Always on" } }, as: :json

    expect(response).to have_http_status(:ok)
    expect(json).to include("brand_name" => "Friday", "tagline" => "Always on")
    expect(Setting.current).to have_attributes(brand_name: "Friday", tagline: "Always on")
  end

  it "rejects a blank brand name" do
    patch api_settings_path, params: { setting: { brand_name: "" } }, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(json["errors"]).to have_key("brand_name")
  end

  it "ignores unknown attributes" do
    patch api_settings_path, params: { setting: { tagline: "x", singleton_guard: 5 } }, as: :json

    expect(response).to have_http_status(:ok)
    expect(Setting.current.singleton_guard).to eq(0)
  end
end
