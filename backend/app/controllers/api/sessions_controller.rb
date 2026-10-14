class Api::SessionsController < ApplicationController
  allow_unauthenticated_access only: :create
  rate_limit to: 10, within: 3.minutes, only: :create,
    with: -> { render json: { error: "Too many sign-in attempts. Try again in a few minutes." }, status: :too_many_requests }

  # GET /api/session - who is signed in, and until when
  def show
    render json: session_json
  end

  # POST /api/session { username, password }
  def create
    user = User.authenticate_by(username: params[:username].to_s.strip.downcase, password: params[:password].to_s)

    if user
      Session.purge_expired
      start_session_for(user)
      render json: session_json, status: :created
    else
      render json: { error: "Incorrect username or password" }, status: :unauthorized
    end
  end

  # DELETE /api/session
  def destroy
    end_session
    head :no_content
  end

  private
    def session_json
      { username: current_user.username, expires_at: current_session.expires_at, signed_in_at: current_session.created_at }
    end
end
