module AuthHelpers
  PASSWORD = "correct-horse-battery".freeze

  def current_test_user
    @current_test_user ||= User.first || create(:user)
  end

  def sign_in(user = current_test_user, password: PASSWORD)
    post api_session_path, params: { username: user.username, password: password }, as: :json
    expect(response).to have_http_status(:created)
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
  # Request specs run signed in unless tagged `signed_out: true`
  config.before(:each, type: :request) { |example| sign_in unless example.metadata[:signed_out] }
end
