require "rails_helper"

RSpec.describe "Api::Documents", type: :request do
  let(:json) { response.parsed_body }

  def upload(content, filename, content_type = "application/octet-stream")
    Rack::Test::UploadedFile.new(StringIO.new(content), content_type, original_filename: filename)
  end

  describe "GET /api/documents" do
    it "lists documents with file summaries, most recently updated first" do
      older = create(:document, updated_at: 1.day.ago)
      newer = create(:document, files: %w[ one.txt two.txt ])

      get api_documents_path, as: :json

      expect(response).to have_http_status(:ok)
      expect(json["data"].pluck("id")).to eq([ newer.id, older.id ])
      expect(json["data"].first).to include("file_count" => 2, "filenames" => %w[ one.txt two.txt ])
      expect(json["meta"]).to include("page" => 1, "per_page" => 50, "total_count" => 2)
    end

    it "searches names and file names" do
      create(:document, name: "Passport", files: %w[ scan.png ])
      create(:document, name: "Car", files: %w[ insurance-policy.pdf ])

      get api_documents_path(q: "insurance"), as: :json

      expect(json["data"].pluck("name")).to eq([ "Car" ])
      expect(json["meta"]).to include("total_count" => 1, "query" => "insurance")
    end

    it "paginates 50 per page" do
      create_list(:document, 51)

      get api_documents_path(page: 2), as: :json

      expect(json["data"].size).to eq(1)
      expect(json["meta"]).to include("page" => 2, "total_pages" => 2)
    end
  end

  describe "GET /api/documents/:id" do
    it "lists each file" do
      document = create(:document, files: [ { filename: "a.txt", content: "hello" }, "b.pdf" ])

      get api_document_path(document), as: :json

      expect(json["name"]).to eq(document.name)
      expect(json["files"].pluck("filename")).to eq(%w[ a.txt b.pdf ])
      expect(json["files"].first).to include("byte_size" => 5, "content_type" => "text/plain", "preview_kind" => "text")
      expect(json["files"].first).not_to have_key("encryption_key")
    end
  end

  describe "POST /api/documents" do
    it "creates a document from several files" do
      expect {
        post api_documents_path, params: { name: "Receipts", files: [ upload("one", "1.txt"), upload("two", "2.txt") ] }
      }.to change(Document, :count).by(1).and change(DocumentFile, :count).by(2)

      expect(response).to have_http_status(:created)
      expect(json).to include("name" => "Receipts", "total_bytes" => 6)
      expect(json["files"].pluck("filename")).to eq(%w[ 1.txt 2.txt ])
    end

    it "requires a name and at least one file" do
      post api_documents_path, params: { name: "" }

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]).to include("name", "files")
      expect(json["errors"]["files"]).to include("must include at least one file")
    end

    it "rejects files over the size limit and saves nothing" do
      stub_const("DocumentFile::MAX_BYTES", 1.megabyte)
      big = upload("x" * (1.megabyte + 1), "big.bin")

      expect {
        post api_documents_path, params: { name: "Too big", files: [ upload("ok", "ok.txt"), big ] }
      }.not_to change(Document, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]["files"]).to eq([ "big.bin is larger than 1 MB" ])
    end
  end

  describe "PATCH /api/documents/:id" do
    it "renames the document" do
      document = create(:document)

      patch api_document_path(document), params: { document: { name: "Renamed" } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(document.reload.name).to eq("Renamed")
    end
  end

  describe "DELETE /api/documents/:id" do
    it "deletes the document and its files" do
      document = create(:document, files: %w[ a.txt b.txt ])

      expect { delete api_document_path(document) }.to change(DocumentFile, :count).by(-2)
      expect(response).to have_http_status(:no_content)
    end
  end

  describe "document files" do
    let(:document) { create(:document, files: [ { filename: "notes.txt", content: "Top <script>secret</script>" } ]) }
    let(:file) { document.files.first }

    it "adds files to an existing document" do
      post api_document_files_path(document), params: { files: [ upload("more", "more.txt") ] }

      expect(response).to have_http_status(:created)
      expect(json["files"].pluck("filename")).to eq(%w[ notes.txt more.txt ])
    end

    it "rejects oversized files when adding" do
      stub_const("DocumentFile::MAX_BYTES", 1.megabyte)
      post api_document_files_path(document), params: { files: [ upload("x" * (1.megabyte + 1), "big.bin") ] }

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "downloads the decrypted file as an attachment" do
      get download_api_document_file_path(document, file)

      expect(response).to have_http_status(:ok)
      expect(response.body).to eq("Top <script>secret</script>")
      expect(response.headers["Content-Disposition"]).to start_with("attachment").and include("notes.txt")
      expect(response.headers["Cache-Control"]).to include("no-store")
    end

    it "streams large binary files intact" do
      data = Random.bytes((FileCipher::CHUNK_BYTES * 2.5).to_i)
      big = create(:document, files: [ { filename: "big.bin", content: data } ])

      get download_api_document_file_path(big, big.files.first)

      expect(response).to have_http_status(:ok)
      expect(response.headers["Content-Length"]).to eq(data.bytesize.to_s)
      expect(response.body.b).to eq(data)
    end

    it "previews text inline as plain text with a locked-down CSP" do
      get download_api_document_file_path(document, file, disposition: "inline")

      expect(response.headers["Content-Disposition"]).to start_with("inline")
      expect(response.media_type).to eq("text/plain")
      expect(response.headers["Content-Security-Policy"]).to include("sandbox")
    end

    it "refuses inline previews for unsupported types" do
      zip = create(:document, files: [ { filename: "a.zip", content: "PK\x03\x04#{'x' * 30}".b } ])

      get download_api_document_file_path(zip, zip.files.first, disposition: "inline")

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "deletes a file but never the last one" do
      post api_document_files_path(document), params: { files: [ upload("more", "more.txt") ] }
      delete api_document_file_path(document, file)

      expect(response).to have_http_status(:ok)
      expect(json["files"].pluck("filename")).to eq(%w[ more.txt ])

      delete api_document_file_path(document, document.files.reload.first)
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "returns 404 for a file from another document" do
      other = create(:document)

      get download_api_document_file_path(document, other.files.first)

      expect(response).to have_http_status(:not_found)
    end
  end
end
