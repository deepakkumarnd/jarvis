require "rails_helper"

RSpec.describe Credential, type: :model do
  def raw_column(table, column, id)
    ActiveRecord::Base.connection.select_value("SELECT #{column} FROM #{table} WHERE id = #{id.to_i}")
  end

  describe "polymorphic types" do
    it "delegates to the typed record" do
      expect(create(:credential).secretable).to be_a(UsernamePassword)
      expect(create(:credential, :api_key).secretable).to be_a(ApiKeyPair)
      expect(create(:credential, :secret_text).secretable).to be_a(SecretText)
    end

    it "maps kinds to types" do
      expect(create(:credential, :api_key).kind).to eq("api_key")
      expect(described_class.kind_for("SecretText")).to eq("secret_text")
    end

    it "is reachable from the typed record" do
      credential = create(:credential)
      expect(credential.secretable.credential).to eq(credential)
    end
  end

  describe "encryption at rest" do
    it "stores every field encrypted" do
      login = create(:credential, secretable: build(:username_password, username: "deepak", password: "hunter2-very-secret"))
      api = create(:credential, :api_key)
      note = create(:credential, :secret_text)

      expect(raw_column("username_passwords", "username", login.secretable_id)).not_to include("deepak")
      expect(raw_column("username_passwords", "password", login.secretable_id)).not_to include("hunter2")
      expect(raw_column("api_key_pairs", "secret_key", api.secretable_id)).not_to include(api.secretable.secret_key)
      expect(raw_column("api_key_pairs", "api_key", api.secretable_id)).not_to include(api.secretable.api_key)
      expect(raw_column("secret_texts", "secret", note.secretable_id)).not_to include(note.secretable.secret.first(20))
      expect(UsernamePassword.find(login.secretable_id).password).to eq("hunter2-very-secret")
    end
  end

  describe ".build_of_kind" do
    let(:group) { create(:credential_group) }

    it "builds the typed record and ignores unknown fields" do
      credential = described_class.build_of_kind("api_key", name: "Stripe", group: group,
                                                 fields: { "api_key" => "pk", "secret_key" => "sk", "password" => "x" })
      credential.save!

      expect(credential.secretable).to have_attributes(api_key: "pk", secret_key: "sk")
    end

    it "returns nil for an unknown kind" do
      expect(described_class.build_of_kind("ssh_key", name: "x", fields: {})).to be_nil
    end

    it "validates the typed fields" do
      credential = described_class.build_of_kind("username_password", name: "Bank", group: group, fields: { "username" => "me" })

      expect(credential).not_to be_valid
      expect(credential.secretable.errors[:password]).to include("can't be blank")
    end
  end

  describe "#update_with_fields" do
    let(:credential) { create(:credential, secretable: build(:username_password, username: "old", password: "keep-me")) }

    it "keeps the secret when it's left blank" do
      credential.update_with_fields(name: "Renamed", fields: { "username" => "new", "password" => "" })

      expect(credential.reload).to have_attributes(name: "Renamed")
      expect(credential.secretable.reload).to have_attributes(username: "new", password: "keep-me")
    end

    it "replaces the secret when given" do
      credential.update_with_fields(name: nil, fields: { "password" => "changed" })

      expect(credential.secretable.reload.password).to eq("changed")
    end

    it "rejects a blank identifier" do
      expect(credential.update_with_fields(name: nil, fields: { "username" => "" })).to be(false)
    end
  end

  describe "#as_json" do
    it "includes identifiers but never secrets" do
      json = create(:credential, :api_key).as_json

      expect(json["fields"].keys).to eq([ "api_key" ])
      expect(json["secret_fields"]).to eq([ "secret_key" ])
      expect(json.to_s).not_to include("sk_")
    end
  end

  it "deletes its typed record" do
    credential = create(:credential, :secret_text)
    expect { credential.destroy }.to change(SecretText, :count).by(-1)
  end
end
