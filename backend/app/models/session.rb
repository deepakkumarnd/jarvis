require "digest"

# A signed-in browser. The cookie holds a random token; only its SHA-256 digest is stored,
# so a leaked database can't be used to hijack sessions. Sessions expire a month after login.
class Session < ApplicationRecord
  LIFETIME = 1.month

  belongs_to :user

  scope :active, -> { where("expires_at > ?", Time.current) }

  attr_reader :token

  # Starts a session and returns it with its plaintext token (only available here)
  def self.start!(user:, ip_address: nil, user_agent: nil)
    token = SecureRandom.base58(32)
    session = create!(user: user, token_digest: digest(token), expires_at: LIFETIME.from_now,
                      ip_address: ip_address, user_agent: user_agent.to_s.first(255))
    session.instance_variable_set(:@token, token)
    session
  end

  def self.find_active_by_token(token)
    active.includes(:user).find_by(token_digest: digest(token)) if token.present?
  end

  def self.digest(token) = Digest::SHA256.hexdigest(token)

  def self.purge_expired = where(expires_at: ..Time.current).delete_all
end
