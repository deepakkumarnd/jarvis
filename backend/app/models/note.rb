class Note < ApplicationRecord
  PREVIEW_LENGTH = 600

  # The column is NOT NULL; treat a missing body as empty
  normalizes :body, with: ->(body) { body.to_s }, apply_to_nil: true

  validates :title, presence: true, length: { maximum: 255 }
  validates :body, length: { maximum: 100_000 }

  # Leading slice of the Markdown body for list views, cut on a word boundary
  def preview
    body.truncate(PREVIEW_LENGTH, separator: /\s/, omission: "…")
  end

  def preview_truncated?
    body.length > PREVIEW_LENGTH
  end

  # List representation: the preview instead of the full body to keep pages small
  def as_summary_json
    as_json(except: :body).merge("preview" => preview, "truncated" => preview_truncated?)
  end
end
