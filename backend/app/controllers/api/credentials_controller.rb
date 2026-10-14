class Api::CredentialsController < ApplicationController
  before_action :set_group
  before_action :set_credential, only: %i[ update destroy secret ]

  # POST /api/credential_groups/:credential_group_id/credentials
  #   { credential: { name, kind: username_password|api_key|secret_text, fields: { ... } } }
  def create
    kind = credential_params[:kind]
    unless Credential::KINDS.key?(kind)
      return render json: { errors: { kind: [ "must be one of: #{Credential::KINDS.keys.join(', ')}" ] } }, status: :unprocessable_content
    end

    credential = Credential.build_of_kind(kind, name: credential_params[:name], fields: credential_params[:fields] || {}, group: @group)
    if credential.save
      render json: credential, status: :created
    else
      render_errors(credential)
    end
  end

  # PATCH /api/credential_groups/:credential_group_id/credentials/:id
  # The kind can't change. Blank secret fields keep their current value.
  def update
    if @credential.update_with_fields(name: credential_params[:name], fields: credential_params[:fields] || {})
      render json: @credential
    else
      render_errors(@credential)
    end
  end

  # DELETE /api/credential_groups/:credential_group_id/credentials/:id
  def destroy
    @credential.destroy!
    head :no_content
  end

  # GET /api/credential_groups/:credential_group_id/credentials/:id/secret
  # The only endpoint that returns secret values, for when the user chooses to view or copy them.
  def secret
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    render json: @credential.secret_json
  end

  private
    def set_group
      @group = CredentialGroup.find(params.expect(:credential_group_id))
    end

    def set_credential
      @credential = @group.credentials.includes(:secretable).find(params.expect(:id))
    end

    def credential_params
      @credential_params ||= params.expect(credential: [ :name, :kind, fields: {} ])
    end

    # Field errors from the typed record are reported under their own names
    # ("password", not "secretable.password")
    def render_errors(credential)
      errors = credential.errors.to_hash.except(:secretable).transform_keys { |key| key.to_s.delete_prefix("secretable.") }
      render json: { errors: errors }, status: :unprocessable_content
    end
end
