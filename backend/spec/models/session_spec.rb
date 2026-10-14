require "rails_helper"

RSpec.describe Session, type: :model do
  let(:user) { create(:user) }

  it "stores only a digest of the token" do
    session = described_class.start!(user: user)

    expect(session.token).to be_present
    expect(session.token_digest).to eq(Digest::SHA256.hexdigest(session.token))
    expect(described_class.find(session.id).token).to be_nil
  end

  it "expires a month after login" do
    freeze_time do
      expect(described_class.start!(user: user).expires_at).to eq(1.month.from_now)
    end
  end

  it "finds active sessions by token only" do
    session = described_class.start!(user: user)

    expect(described_class.find_active_by_token(session.token)).to eq(session)
    expect(described_class.find_active_by_token("nope")).to be_nil
    expect(described_class.find_active_by_token(nil)).to be_nil

    travel 1.month + 1.second do
      expect(described_class.find_active_by_token(session.token)).to be_nil
    end
  end

  it "purges expired sessions" do
    expired = described_class.start!(user: user).tap { |s| s.update!(expires_at: 1.minute.ago) }
    live = described_class.start!(user: user)

    described_class.purge_expired

    expect(described_class.all).to contain_exactly(live)
    expect { expired.reload }.to raise_error(ActiveRecord::RecordNotFound)
  end
end
