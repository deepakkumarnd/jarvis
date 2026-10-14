# The single account that can sign in. Create it with `bin/rails auth:create_user`.
class User < ApplicationRecord
  MIN_PASSWORD_LENGTH = 10

  has_secure_password
  has_many :sessions, dependent: :delete_all

  normalizes :username, with: ->(username) { username.strip.downcase }

  validates :username, presence: true, uniqueness: true, length: { maximum: 50 },
    format: { with: /\A[a-z0-9._@-]+\z/, message: "can only contain letters, numbers and . _ @ -" }
  validates :password, length: { minimum: MIN_PASSWORD_LENGTH }, allow_nil: true
  validate :only_one_user, on: :create

  private
    def only_one_user
      errors.add(:base, "This is a single-user system and a user already exists") if User.exists?
    end
end
