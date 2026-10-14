require "rails_helper"

RSpec.describe DocumentFile, type: :model do
  def upload(content, filename:, content_type: "application/octet-stream")
    Rack::Test::UploadedFile.new(StringIO.new(content), content_type, original_filename: filename)
  end

  let(:document) { create(:document) }
  let(:content) { "Secret contents #{Faker::Lorem.paragraph}" }

  describe ".from_upload" do
    subject(:file) { described_class.from_upload(upload(content, filename: "notes.txt"), document: document).tap(&:save!) }

    it "records plaintext metadata" do
      expect(file).to have_attributes(filename: "notes.txt", content_type: "text/plain", byte_size: content.bytesize,
                                      checksum: Digest::SHA256.hexdigest(content))
    end

    it "stores only ciphertext" do
      stored = file.ciphertext.download
      expect(stored).not_to include("Secret contents")
      expect(stored.bytesize).to eq(content.bytesize + FileCipher::NONCE_BYTES + FileCipher::TAG_BYTES)
      expect(file.ciphertext.content_type).to eq("application/octet-stream")
    end

    it "encrypts the per-file key in the database" do
      raw = described_class.connection.select_value("SELECT encryption_key FROM document_files WHERE id = #{file.id}")
      expect(raw).not_to include(file.encryption_key)
      expect(file.encryption_key).to be_present
    end

    it "decrypts back to the original bytes" do
      expect(described_class.find(file.id).read).to eq(content.b)
    end

    it "detects the content type from the bytes" do
      png = "\x89PNG\r\n\x1a\n".b + Random.bytes(64)
      file = described_class.from_upload(upload(png, filename: "photo.bin"), document: document)
      expect(file.content_type).to eq("image/png")
    end

    it "sanitizes the filename" do
      file = described_class.from_upload(upload(content, filename: "../../etc/passwd"), document: document)
      expect(file.filename).not_to include("/")
    end

    it "allows files up to 100 MB" do
      expect(described_class::MAX_BYTES).to eq(100.megabytes)
      expect(described_class.max_size_label).to eq("100 MB")
    end

    context "with a lower limit" do
      before { stub_const("DocumentFile::MAX_BYTES", 2.megabytes) }

      it "rejects larger files without reading them" do
        big = upload("x" * (2.megabytes + 1), filename: "big.txt")
        file = described_class.from_upload(big, document: document)

        expect(file).not_to be_valid
        expect(file.errors[:byte_size]).to include("must be 2 MB or less")
        expect(file.ciphertext).not_to be_attached
      end

      it "accepts a file of exactly the limit" do
        file = described_class.from_upload(upload("x" * 2.megabytes, filename: "max.txt"), document: document)
        expect(file).to be_valid
      end
    end

    it "round-trips multi-chunk binary files and cleans up its tempfile" do
      data = Random.bytes((FileCipher::CHUNK_BYTES * 3.5).to_i)
      file = described_class.from_upload(upload(data, filename: "blob.bin"), document: document)
      tempfile = file.instance_variable_get(:@encrypted_tempfile)
      file.save!

      expect(tempfile.path).to be_nil # closed and unlinked after commit
      expect(file.checksum).to eq(Digest::SHA256.hexdigest(data))
      expect(described_class.find(file.id).read).to eq(data)
    end
  end

  describe "#read" do
    it "raises when the stored data was tampered with" do
      file = described_class.from_upload(upload(content, filename: "a.txt"), document: document).tap(&:save!)
      data = file.ciphertext.download.dup
      data.setbyte(15, data.getbyte(15) ^ 0xff)
      file.ciphertext.attach(io: StringIO.new(data), filename: "x.bin", content_type: "application/octet-stream", identify: false)

      expect { described_class.find(file.id).read }.to raise_error(FileCipher::Error)
    end
  end

  describe "#preview_kind" do
    it "classifies previewable types" do
      expect(described_class.new(content_type: "image/png").preview_kind).to eq("image")
      expect(described_class.new(content_type: "application/pdf").preview_kind).to eq("pdf")
      expect(described_class.new(content_type: "text/markdown").preview_kind).to eq("text")
      expect(described_class.new(content_type: "application/json").preview_kind).to eq("text")
      expect(described_class.new(content_type: "application/zip").preview_kind).to be_nil
    end
  end
end
