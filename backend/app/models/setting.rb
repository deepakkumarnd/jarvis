# Application-wide settings, stored as a single database row.
class Setting < ApplicationRecord
  validates :brand_name, presence: true, length: { maximum: 50 }
  validates :tagline, length: { maximum: 120 }
  validates :singleton_guard, inclusion: { in: [ 0 ] }

  normalizes :brand_name, :tagline, with: ->(value) { value.to_s.strip }

  # The settings row, created with the column defaults on first use
  def self.current
    first || create!
  rescue ActiveRecord::RecordNotUnique
    first # another request created it concurrently
  end

  def as_json(*)
    super(only: %i[ brand_name tagline updated_at ])
  end
end
