require "rails_helper"

RSpec.describe CredentialGroup, type: :model do
  it "requires a name" do
    expect(build(:credential_group, name: "")).not_to be_valid
  end

  it "deletes its credentials and their typed records" do
    group = create(:credential_group)
    create(:credential, credential_group: group)
    create(:credential, :api_key, credential_group: group)

    expect { group.destroy }.to change(Credential, :count).by(-2).and change(UsernamePassword, :count).by(-1).and change(ApiKeyPair, :count).by(-1)
  end

  describe ".search" do
    let!(:bank) { create(:credential_group, name: "Bank") }
    let!(:cloud) { create(:credential_group, name: "Cloud") }

    before { create(:credential, :api_key, credential_group: cloud, name: "AWS root") }

    it "matches group and credential names" do
      expect(described_class.search("BANK")).to contain_exactly(bank)
      expect(described_class.search("aws")).to contain_exactly(cloud)
    end

    it "never matches secret values" do
      secret = cloud.credentials.first.secretable.secret_key
      expect(described_class.search(secret)).to be_empty
    end
  end
end
