require "rails_helper"

RSpec.describe "Credentials API", type: :request do
  def json = response.parsed_body
  let(:group) { create(:credential_group, name: "Personal") }

  describe "credential groups" do
    it "lists groups with summaries and no secrets" do
      login = create(:credential, credential_group: group, name: "Email")
      create(:credential, :secret_text, credential_group: group, name: "Recovery codes")

      get api_credential_groups_path, as: :json

      expect(json["data"].first).to include("name" => "Personal", "credential_count" => 2,
                                            "kinds" => %w[ username_password secret_text ], "credential_names" => [ "Email", "Recovery codes" ])
      expect(response.body).not_to include(login.secretable.password)
    end

    it "searches and paginates" do
      create_list(:credential_group, 50)
      create(:credential, credential_group: group, name: "Netflix")

      get api_credential_groups_path(q: "netflix"), as: :json
      expect(json["data"].pluck("name")).to eq([ "Personal" ])

      get api_credential_groups_path(page: 2), as: :json
      expect(json["data"].size).to eq(1)
      expect(json["meta"]).to include("total_count" => 51, "total_pages" => 2)
    end

    it "shows identifiers but not secrets" do
      credential = create(:credential, credential_group: group)

      get api_credential_group_path(group), as: :json

      expect(json["credentials"].first).to include("kind" => "username_password", "fields" => { "username" => credential.secretable.username },
                                                   "secret_fields" => [ "password" ])
      expect(response.body).not_to include(credential.secretable.password)
    end

    it "creates, renames and deletes a group" do
      post api_credential_groups_path, params: { credential_group: { name: "Work" } }, as: :json
      expect(response).to have_http_status(:created)
      id = json["id"]

      patch api_credential_group_path(id), params: { credential_group: { name: "Work accounts" } }, as: :json
      expect(json["name"]).to eq("Work accounts")

      delete api_credential_group_path(id)
      expect(response).to have_http_status(:no_content)
    end

    it "requires a name" do
      post api_credential_groups_path, params: { credential_group: { name: "" } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]).to have_key("name")
    end
  end

  describe "credentials" do
    def create_credential(kind, fields, name: "Item")
      post api_credential_group_credentials_path(group), params: { credential: { name: name, kind: kind, fields: fields } }, as: :json
    end

    it "creates each kind without echoing the secret" do
      create_credential("username_password", { username: "me@example.com", password: "p@ss-word!" })
      expect(response).to have_http_status(:created)
      expect(json).to include("kind" => "username_password", "fields" => { "username" => "me@example.com" })
      expect(response.body).not_to include("p@ss-word!")

      create_credential("api_key", { api_key: "pk_live", secret_key: "sk_live_secret" })
      expect(json).to include("kind" => "api_key", "fields" => { "api_key" => "pk_live" })
      expect(response.body).not_to include("sk_live_secret")

      create_credential("secret_text", { secret: "line 1\nline 2" })
      expect(json).to include("kind" => "secret_text", "fields" => {}, "secret_fields" => [ "secret" ])
    end

    it "reports field errors under their own names" do
      create_credential("api_key", { api_key: "pk_only" }, name: "")

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"].keys).to contain_exactly("name", "secret_key")
    end

    it "rejects an unknown kind" do
      create_credential("ssh_key", { key: "x" })

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]).to have_key("kind")
    end

    it "updates a credential, keeping a blank secret" do
      credential = create(:credential, credential_group: group, secretable: build(:username_password, password: "original"))

      patch api_credential_group_credential_path(group, credential),
        params: { credential: { name: "Renamed", fields: { username: "new-user", password: "" } } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json).to include("name" => "Renamed", "fields" => { "username" => "new-user" })
      expect(credential.secretable.reload.password).to eq("original")
    end

    it "deletes a credential" do
      credential = create(:credential, credential_group: group)

      expect { delete api_credential_group_credential_path(group, credential) }.to change(Credential, :count).by(-1)
    end

    describe "GET secret" do
      it "returns the secret values with no-store caching" do
        credential = create(:credential, :api_key, credential_group: group)

        get secret_api_credential_group_credential_path(group, credential), as: :json

        expect(response).to have_http_status(:ok)
        expect(json).to eq("id" => credential.id, "secrets" => { "secret_key" => credential.secretable.secret_key })
        expect(response.headers["Cache-Control"]).to include("no-store")
      end

      it "returns multi-line secret text" do
        credential = create(:credential, :secret_text, credential_group: group, secretable: build(:secret_text, secret: "a\nb"))

        get secret_api_credential_group_credential_path(group, credential), as: :json

        expect(json["secrets"]).to eq("secret" => "a\nb")
      end

      it "returns 404 for a credential from another group" do
        other = create(:credential)

        get secret_api_credential_group_credential_path(group, other), as: :json

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  it "keeps credential values out of the logs" do
    filter = ActiveSupport::ParameterFilter.new(Rails.application.config.filter_parameters)
    params = { "credential" => { "name" => "Bank", "fields" => { "username" => "u", "password" => "p", "api_key" => "a", "secret_key" => "s", "secret" => "t" } } }

    expect(filter.filter(params)).to eq("credential" => { "name" => "Bank", "fields" => {
      "username" => "[FILTERED]", "password" => "[FILTERED]", "api_key" => "[FILTERED]", "secret_key" => "[FILTERED]", "secret" => "[FILTERED]"
    } })
  end
end
