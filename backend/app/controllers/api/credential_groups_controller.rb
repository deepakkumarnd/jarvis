class Api::CredentialGroupsController < ApplicationController
  include Paginatable

  before_action :set_group, only: %i[ show update destroy ]

  # GET /api/credential_groups?q=term&page=1
  # Searches group and credential names. Never includes secret values.
  def index
    scope = CredentialGroup.includes(credentials: :secretable).order(updated_at: :desc, id: :desc)
    query = params[:q].to_s.strip
    scope = scope.search(query) if query.present?

    render_paginated(scope, meta: { query: query.presence }, &:as_summary_json)
  end

  # GET /api/credential_groups/:id
  # Credentials with their identifying fields (username, API key); secrets are fetched separately.
  def show
    render json: @group.as_detail_json
  end

  # POST /api/credential_groups
  def create
    group = CredentialGroup.new(group_params)

    if group.save
      render json: group.as_detail_json, status: :created, location: api_credential_group_url(group)
    else
      render json: { errors: group.errors }, status: :unprocessable_content
    end
  end

  # PATCH /api/credential_groups/:id
  def update
    if @group.update(group_params)
      render json: @group.as_detail_json
    else
      render json: { errors: @group.errors }, status: :unprocessable_content
    end
  end

  # DELETE /api/credential_groups/:id
  def destroy
    @group.destroy!
    head :no_content
  end

  private
    def set_group
      @group = CredentialGroup.includes(credentials: :secretable).find(params.expect(:id))
    end

    def group_params
      params.expect(credential_group: [ :name ])
    end
end
