class Api::NotesController < ApplicationController
  include Paginatable

  before_action :set_note, only: %i[ show update destroy ]

  # GET /api/notes?page=1
  # Most recently edited first; each note carries a Markdown preview instead of the full body.
  def index
    render_paginated(Note.order(updated_at: :desc, id: :desc), &:as_summary_json)
  end

  # GET /api/notes/:id
  def show
    render json: @note
  end

  # POST /api/notes
  def create
    note = Note.new(note_params)

    if note.save
      render json: note, status: :created, location: api_note_url(note)
    else
      render json: { errors: note.errors }, status: :unprocessable_content
    end
  end

  # PATCH/PUT /api/notes/:id
  def update
    if @note.update(note_params)
      render json: @note
    else
      render json: { errors: @note.errors }, status: :unprocessable_content
    end
  end

  # DELETE /api/notes/:id
  def destroy
    @note.destroy!
    head :no_content
  end

  private
    def set_note
      @note = Note.find(params.expect(:id))
    end

    def note_params
      params.expect(note: [ :title, :body ])
    end
end
