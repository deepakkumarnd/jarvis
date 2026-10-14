require "rails_helper"

RSpec.describe User, type: :model do
  it "hashes the password" do
    user = create(:user)
    expect(user.password_digest).to start_with("$2")
    expect(user.authenticate(AuthHelpers::PASSWORD)).to eq(user)
    expect(user.authenticate("wrong")).to be(false)
  end

  it "allows only one user" do
    create(:user)
    second = build(:user, username: "someone")

    expect(second).not_to be_valid
    expect(second.errors[:base]).to include("This is a single-user system and a user already exists")
  end

  it "normalizes the username" do
    expect(create(:user, username: "  Deepak ").username).to eq("deepak")
  end

  it "requires a password of at least 10 characters" do
    expect(build(:user, password: "short")).not_to be_valid
  end

  it "rejects odd characters in the username" do
    expect(build(:user, username: "deepak smith")).not_to be_valid
  end
end
