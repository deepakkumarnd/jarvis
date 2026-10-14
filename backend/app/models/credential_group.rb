class CredentialGroup < ApplicationRecord
  has_many :credentials, -> { order(:created_at, :id) }, dependent: :destroy, inverse_of: :credential_group

  validates :name, presence: true, length: { maximum: 255 }

  # Case-insensitive match on the group name or any credential name (never on secret values)
  scope :search, ->(query) {
    pattern = "%#{sanitize_sql_like(query.to_s.downcase)}%"
    where("LOWER(credential_groups.name) LIKE ?", pattern)
      .or(where(id: Credential.where("LOWER(credentials.name) LIKE ?", pattern).select(:credential_group_id)))
  }

  # List representation; expects credentials to be preloaded. No secret material.
  def as_summary_json
    as_json(only: %i[ id name created_at updated_at ]).merge(
      "credential_count" => credentials.size,
      "kinds" => credentials.map(&:kind).uniq,
      "credential_names" => credentials.first(5).map(&:name)
    )
  end

  def as_detail_json
    as_json(only: %i[ id name created_at updated_at ]).merge("credentials" => credentials.map(&:as_json))
  end
end
