# Cookie-based session authentication for the API.
#
# Every action requires a signed-in user unless the controller calls
# `allow_unauthenticated_access`. The session cookie is httpOnly and SameSite=Lax
# (Secure over HTTPS); state-changing requests must also come from our own origin.
module Authentication
  extend ActiveSupport::Concern

  COOKIE_NAME = :jarvis_session

  included do
    before_action :verify_same_origin, unless: -> { request.get? || request.head? }
    before_action :require_authentication
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private
    def current_session
      return @current_session if defined?(@current_session)

      @current_session = Session.find_active_by_token(cookies[COOKIE_NAME])
    end

    def current_user = current_session&.user
    def authenticated? = current_user.present?

    def require_authentication
      return if authenticated?

      cookies.delete(COOKIE_NAME) if cookies[COOKIE_NAME]
      render json: { error: "Not signed in", setup_required: !User.exists? }, status: :unauthorized
    end

    def start_session_for(user)
      session = Session.start!(user: user, ip_address: request.remote_ip, user_agent: request.user_agent)
      cookies[COOKIE_NAME] = {
        value: session.token,
        expires: session.expires_at,
        httponly: true,
        same_site: :lax,
        secure: request.ssl?
      }
      @current_session = session
    end

    def end_session
      current_session&.destroy
      cookies.delete(COOKIE_NAME)
      @current_session = nil
    end

    # Blocks cross-site form posts and fetches: browsers always send Origin on these methods
    def verify_same_origin
      origin = request.headers["Origin"]
      return if origin.blank? || origin == request.base_url

      render json: { error: "Cross-origin request blocked" }, status: :forbidden
    end
end
