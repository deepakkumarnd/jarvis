class Api::BookmarksController < ApplicationController
  include Paginatable

  before_action :set_bookmark, only: %i[ show update destroy ]

  # GET /api/bookmarks?page=1
  def index
    render_paginated Bookmark.order(created_at: :desc, id: :desc)
  end

  # GET /api/bookmarks/search?q=term&page=1
  def search
    query = params[:q].to_s.strip
    return render json: { error: "q parameter is required" }, status: :bad_request if query.empty?

    render_paginated Bookmark.search_by_name(query).order(:name, :id)
  end

  # GET /api/bookmarks/:id
  def show
    render json: @bookmark
  end

  # POST /api/bookmarks
  def create
    bookmark = Bookmark.new(bookmark_params)

    if bookmark.save
      render json: bookmark, status: :created, location: api_bookmark_url(bookmark)
    else
      render json: { errors: bookmark.errors }, status: :unprocessable_content
    end
  end

  # PATCH/PUT /api/bookmarks/:id
  def update
    if @bookmark.update(bookmark_params)
      render json: @bookmark
    else
      render json: { errors: @bookmark.errors }, status: :unprocessable_content
    end
  end

  # DELETE /api/bookmarks/:id
  def destroy
    @bookmark.destroy!
    head :no_content
  end

  private
    def set_bookmark
      @bookmark = Bookmark.find(params.expect(:id))
    end

    def bookmark_params
      params.expect(bookmark: [ :name, :link ])
    end
end
