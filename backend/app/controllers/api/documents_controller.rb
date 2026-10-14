class Api::DocumentsController < ApplicationController
  include Paginatable

  MAX_FILES_PER_UPLOAD = 20

  before_action :set_document, only: %i[ show update destroy ]

  # GET /api/documents?q=term&page=1
  # Searches document names and file names; most recently updated first.
  def index
    scope = Document.includes(:files).order(updated_at: :desc, id: :desc)
    query = params[:q].to_s.strip
    scope = scope.search(query) if query.present?

    render_paginated(scope, meta: { query: query.presence }, &:as_summary_json)
  end

  # GET /api/documents/:id
  def show
    render json: @document.as_detail_json
  end

  # POST /api/documents (multipart: name, files[])
  def create
    uploads = uploaded_files
    document = Document.new(name: params[:name])
    errors = upload_errors(uploads)

    if errors.empty?
      uploads.each { |upload| document.files << DocumentFile.from_upload(upload, document: document) }
      return render json: document.as_detail_json, status: :created, location: api_document_url(document) if document.save
    end

    render json: { errors: document.tap(&:validate).errors.to_hash.merge(errors) }, status: :unprocessable_content
  end

  # PATCH /api/documents/:id
  def update
    if @document.update(params.expect(document: [ :name ]))
      render json: @document.as_detail_json
    else
      render json: { errors: @document.errors }, status: :unprocessable_content
    end
  end

  # DELETE /api/documents/:id
  def destroy
    @document.destroy!
    head :no_content
  end

  private
    def set_document
      @document = Document.includes(:files).find(params.expect(:id))
    end

    def uploaded_files
      Array(params[:files]).select { |f| f.respond_to?(:original_filename) }
    end

    # Validates the uploads before anything is read or encrypted
    def upload_errors(uploads)
      messages = []
      messages << "must include at least one file" if uploads.empty?
      messages << "can include at most #{MAX_FILES_PER_UPLOAD} files at once" if uploads.size > MAX_FILES_PER_UPLOAD
      uploads.select { |u| u.size > DocumentFile::MAX_BYTES }.each { |u| messages << "#{u.original_filename} is larger than #{DocumentFile.max_size_label}" }
      messages.empty? ? {} : { files: messages }
    end
end
