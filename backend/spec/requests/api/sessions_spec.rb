require "rails_helper"

RSpec.describe "Authentication", type: :request do
  def json = response.parsed_body
  def session_cookie = response.headers["Set-Cookie"].to_s

  describe "signing in", signed_out: true do
    let!(:user) { create(:user) }

    it "sets a month-long httpOnly SameSite cookie" do
      freeze_time do
        post api_session_path, params: { username: "deepak", password: AuthHelpers::PASSWORD }, as: :json

        expect(response).to have_http_status(:created)
        expect(json).to include("username" => "deepak", "expires_at" => 1.month.from_now.as_json)
        expect(session_cookie).to include("jarvis_session=").and include("httponly").and include("samesite=lax")
        expect(Session.count).to eq(1)
      end
    end

    it "accepts the username in any case" do
      post api_session_path, params: { username: " DEEPAK ", password: AuthHelpers::PASSWORD }, as: :json

      expect(response).to have_http_status(:created)
    end

    it "rejects a wrong password with a generic message" do
      post api_session_path, params: { username: "deepak", password: "wrong-password" }, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to eq("Incorrect username or password")
      expect(session_cookie).not_to include("jarvis_session=")
    end

    it "rejects an unknown user with the same message" do
      post api_session_path, params: { username: "mallory", password: AuthHelpers::PASSWORD }, as: :json

      expect(json["error"]).to eq("Incorrect username or password")
    end
  end

  describe "when signed out", signed_out: true do
    it "protects every API endpoint" do
      create(:user)
      %w[ /api/session /api/settings /api/bookmarks /api/notes /api/todos /api/documents /api/credential_groups ].each do |path|
        get path, as: :json
        expect(response).to have_http_status(:unauthorized), "#{path} should require sign-in"
      end
      post "/api/notes", params: { note: { title: "x" } }, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "says when no user has been created yet" do
      get api_session_path, as: :json

      expect(json).to eq("error" => "Not signed in", "setup_required" => true)
    end

    it "keeps the health check public but without metrics" do
      get "/up"

      expect(response).to have_http_status(:ok)
      expect(json).not_to have_key("metrics")
    end
  end

  describe "when signed in" do
    it "reports the session" do
      get api_session_path, as: :json

      expect(json).to include("username" => "deepak")
      expect(Time.zone.parse(json["expires_at"])).to be_within(1.minute).of(1.month.from_now)
    end

    it "includes health metrics" do
      allow(SystemMetrics).to receive(:collect).and_return("cpu" => {})
      get "/up"

      expect(json).to have_key("metrics")
    end

    it "signs out" do
      delete api_session_path

      expect(response).to have_http_status(:no_content)
      expect(Session.count).to eq(0)
      get api_settings_path, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "expires after a month" do
      travel 1.month + 1.minute do
        get api_settings_path, as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end

    it "blocks state-changing requests from other origins" do
      post api_notes_path, params: { note: { title: "x" } }, headers: { "Origin" => "https://evil.example" }, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(Note.count).to eq(0)
    end

    it "allows same-origin requests" do
      post api_notes_path, params: { note: { title: "x" } }, headers: { "Origin" => "http://www.example.com" }, as: :json

      expect(response).to have_http_status(:created)
    end
  end
end
