class CreateDocumentFiles < ActiveRecord::Migration[8.1]
  def change
    create_table :document_files do |t|
      t.references :document, null: false, foreign_key: true
      # Plaintext metadata (kept searchable); the file contents are encrypted
      t.string :filename, null: false
      t.string :content_type, null: false
      t.bigint :byte_size, null: false
      t.string :checksum, null: false # SHA-256 of the plaintext, verified on read
      # Per-file AES-256-GCM key, itself encrypted with Active Record Encryption
      t.text :encryption_key, null: false

      t.timestamps
    end
    add_index :document_files, :filename
  end
end
