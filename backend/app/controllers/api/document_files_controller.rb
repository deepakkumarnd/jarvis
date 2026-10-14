class Api::DocumentFilesController < ApplicationController
  # Responses for inline previews: no scripts, no external loads, never cached
  INLINE_CSP = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox".freeze
  PDF_CSP = "default-src 'none'; object-src 'self'; style-src 'unsafe-inline'".freeze

  before_action :set_document
  before_action :set_file, only: %i[ download destroy ]

  # POST /api/documents/:document_id/files (multipart: files[])
  def create
    uploads = Array(params[:files]).select { |f| f.respond_to?(:original_filename) }
    too_large = uploads.select { |u| u.size > DocumentFile::MAX_BYTES }.map { |u| "#{u.original_filename} is larger than #{DocumentFile.max_size_label}" }

    if uploads.empty? || too_large.any? || uploads.size > Api::DocumentsController::MAX_FILES_PER_UPLOAD
      messages = too_large.presence || [ uploads.empty? ? "must include at least one file" : "can include at most #{Api::DocumentsController::MAX_FILES_PER_UPLOAD} files at once" ]
      return render json: { errors: { files: messages } }, status: :unprocessable_content
    end

    files = uploads.map { |upload| DocumentFile.from_upload(upload, document: @document) }
    DocumentFile.transaction { files.each(&:save!) }
    render json: @document.reload.as_detail_json, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: { files: e.record.errors.full_messages } }, status: :unprocessable_content
  end

  # GET /api/documents/:document_id/files/:id/download[?disposition=inline]
  # Decrypts the file. Inline is only allowed for previewable types (images, PDF, text).
  def download
    inline = params[:disposition] == "inline"
    return render json: { error: "This file type can't be previewed" }, status: :unprocessable_content if inline && !@file.preview_kind

    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = @file.preview_kind == "pdf" ? PDF_CSP : INLINE_CSP if inline

    # Decrypt (and verify) fully before sending anything, then stream from an unlinked
    # file handle so the plaintext never stays on disk and never sits in memory whole.
    plaintext = @file.open_decrypted { |decrypted| File.open(decrypted.path, "rb") }

    response.headers["Content-Disposition"] = ActionDispatch::Http::ContentDisposition.format(
      disposition: inline ? "inline" : "attachment", filename: @file.filename
    )
    response.headers["Content-Length"] = plaintext.size.to_s
    # Text previews are always served as plain text so HTML/JS can't execute
    self.content_type = inline && @file.preview_kind == "text" ? "text/plain; charset=utf-8" : @file.content_type
    self.status = :ok
    self.response_body = StreamedFile.new(plaintext)
  rescue FileCipher::Error => e
    Rails.logger.error("[Documents] #{e.message} (document_file #{@file.id})")
    render json: { error: "This file could not be decrypted" }, status: :internal_server_error
  end

  # DELETE /api/documents/:document_id/files/:id
  def destroy
    if @document.files.size <= 1
      return render json: { error: "A document needs at least one file. Delete the document instead." }, status: :unprocessable_content
    end

    @file.destroy!
    render json: @document.reload.as_detail_json
  end

  # Rack body that streams an open file in chunks and closes it when the response is done
  class StreamedFile
    def initialize(io) = @io = io

    def each
      while (chunk = @io.read(FileCipher::CHUNK_BYTES))
        yield chunk
      end
    end

    def close = @io.close
  end

  private
    def set_document
      @document = Document.includes(:files).find(params.expect(:document_id))
    end

    def set_file
      @file = @document.files.find(params.expect(:id))
    end
end
