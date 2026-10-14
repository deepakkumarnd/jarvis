class Document < ApplicationRecord
  has_many :files, -> { order(:created_at, :id) }, class_name: "DocumentFile", dependent: :destroy, inverse_of: :document

  validates :name, presence: true, length: { maximum: 255 }

  # Case-insensitive match on the document name or any of its file names
  scope :search, ->(query) {
    pattern = "%#{sanitize_sql_like(query.to_s.downcase)}%"
    where("LOWER(documents.name) LIKE ?", pattern)
      .or(where(id: DocumentFile.where("LOWER(document_files.filename) LIKE ?", pattern).select(:document_id)))
  }

  def total_bytes = files.sum(&:byte_size)

  # List representation; expects files to be preloaded
  def as_summary_json
    as_json(only: %i[ id name created_at updated_at ]).merge(
      "file_count" => files.size,
      "total_bytes" => total_bytes,
      "content_types" => files.map(&:content_type).uniq,
      "filenames" => files.first(5).map(&:filename)
    )
  end

  def as_detail_json
    as_json(only: %i[ id name created_at updated_at ]).merge(
      "total_bytes" => total_bytes,
      "files" => files.map(&:as_json)
    )
  end
end
