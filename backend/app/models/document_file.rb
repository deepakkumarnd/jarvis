require "digest"

# One encrypted file within a document.
#
# The uploaded bytes are encrypted with a random per-file AES-256-GCM key (FileCipher)
# and only the ciphertext is stored, via Active Storage. The per-file key is encrypted
# in the database with Active Record Encryption, whose keys live in Rails credentials.
class DocumentFile < ApplicationRecord
  MAX_BYTES = 100.megabytes
  PREVIEW_KINDS = {
    "image" => %w[ image/png image/jpeg image/gif image/webp image/avif image/bmp image/svg+xml ],
    "pdf" => %w[ application/pdf ],
    "text" => %w[ application/json application/xml application/x-yaml application/yaml application/javascript application/csv ]
  }.freeze

  belongs_to :document, touch: true, inverse_of: :files
  has_one_attached :ciphertext

  encrypts :encryption_key

  validates :filename, presence: true, length: { maximum: 255 }
  validates :content_type, :checksum, :encryption_key, presence: true
  validates :byte_size, numericality: { greater_than_or_equal_to: 0 }
  validate :within_size_limit
  validate :ciphertext_attached

  # Builds an encrypted file from an uploaded file (ActionDispatch::Http::UploadedFile or similar).
  # Streams the upload through the cipher into a tempfile, so memory use stays flat for large files.
  def self.from_upload(upload, document: nil)
    filename = ActiveStorage::Filename.new(upload.original_filename.to_s).sanitized
    file = new(document: document, filename: filename, byte_size: upload.size)
    return file if upload.size > MAX_BYTES # invalid; don't read or encrypt it

    upload.rewind
    content_type = Marcel::MimeType.for(upload, name: filename, declared_type: upload.content_type)
    upload.rewind

    key = FileCipher.generate_key
    digest = Digest::SHA256.new
    encrypted = Tempfile.new([ "document-file", ".bin" ], binmode: true)
    FileCipher.encrypt_stream(upload, encrypted, key) { |chunk| digest << chunk }
    encrypted.rewind

    file.assign_attributes(content_type: content_type, checksum: digest.hexdigest, encryption_key: Base64.strict_encode64(key))
    file.ciphertext.attach(io: encrypted, filename: "#{SecureRandom.uuid}.bin", content_type: "application/octet-stream", identify: false)
    file.encrypted_tempfile = encrypted
    file
  end

  attr_writer :encrypted_tempfile
  after_commit :discard_encrypted_tempfile
  after_rollback :discard_encrypted_tempfile

  # Decrypts into a tempfile, verifies the checksum, and yields the open file (rewound).
  # The tempfile is deleted when the block returns.
  def open_decrypted
    ciphertext.open do |encrypted|
      plaintext = Tempfile.new([ "document-file", ".plain" ], binmode: true)
      begin
        digest = Digest::SHA256.new
        FileCipher.decrypt_stream(encrypted, plaintext, Base64.strict_decode64(encryption_key)) { |chunk| digest << chunk }
        raise FileCipher::Error, "checksum mismatch" unless digest.hexdigest == checksum

        plaintext.rewind
        return yield plaintext
      ensure
        plaintext.close!
      end
    end
  end

  # Decrypts and returns the original bytes. Prefer #open_decrypted for large files.
  def read = open_decrypted(&:read)

  # "image", "pdf" or "text" when the browser can safely display it inline, else nil
  def preview_kind
    return "text" if content_type.start_with?("text/")

    PREVIEW_KINDS.find { |_kind, types| types.include?(content_type) }&.first
  end

  def as_json(*)
    {
      "id" => id,
      "filename" => filename,
      "content_type" => content_type,
      "byte_size" => byte_size,
      "preview_kind" => preview_kind,
      "created_at" => created_at
    }
  end

  def self.max_size_label = "#{MAX_BYTES / 1.megabyte} MB"

  private
    def within_size_limit
      errors.add(:byte_size, "must be #{self.class.max_size_label} or less") if byte_size.to_i > MAX_BYTES
    end

    def discard_encrypted_tempfile
      @encrypted_tempfile&.close!
      @encrypted_tempfile = nil
    end

    def ciphertext_attached
      errors.add(:ciphertext, "is missing") if byte_size.to_i <= MAX_BYTES && !ciphertext.attached?
    end
end
