class Bookmark < ApplicationRecord
  validates :name, presence: true, length: { maximum: 255 }
  validates :link, presence: true, length: { maximum: 2048 },
    format: { with: URI::DEFAULT_PARSER.make_regexp(%w[http https]), message: "must be a valid http(s) URL" }

  # Case-insensitive substring match on name
  scope :search_by_name, ->(query) {
    where("LOWER(name) LIKE ?", "%#{sanitize_sql_like(query.to_s.downcase)}%")
  }
end
