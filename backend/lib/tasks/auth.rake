require "io/console"

namespace :auth do
  desc "Create the single user account (AUTH_USERNAME and AUTH_PASSWORD env vars, or prompts)"
  task create_user: :environment do
    abort "A user already exists (#{User.first.username}). Use bin/rails auth:reset_password instead." if User.exists?

    username = ENV["AUTH_USERNAME"].presence || prompt("Username: ")
    password = ENV["AUTH_PASSWORD"].presence || prompt_password
    user = User.new(username: username, password: password)
    abort "Could not create user: #{user.errors.full_messages.to_sentence}" unless user.save

    puts "Created user '#{user.username}'. Sign in at the app's /login page."
  end

  desc "Set a new password for the user and sign out every session (AUTH_PASSWORD env var, or prompts)"
  task reset_password: :environment do
    user = User.first or abort "No user yet. Run bin/rails auth:create_user first."
    password = ENV["AUTH_PASSWORD"].presence || prompt_password
    abort "Could not reset password: #{user.errors.full_messages.to_sentence}" unless user.update(password: password)

    user.sessions.delete_all
    puts "Password updated for '#{user.username}'. All sessions were signed out."
  end

  desc "Sign out every session"
  task sign_out_everywhere: :environment do
    count = Session.delete_all
    puts "Signed out #{count} session(s)."
  end

  def prompt(label)
    print label
    clean_terminal_input($stdin.gets.to_s).strip
  end

  # Asks twice (input hidden) and retries on a mismatch instead of giving up.
  def prompt_password(attempts: 3)
    attempts.times do |attempt|
      password = clean_terminal_input($stdin.getpass("Password (min #{User::MIN_PASSWORD_LENGTH} characters): "))
      confirmation = clean_terminal_input($stdin.getpass("Confirm password: "))
      return password if password == confirmation

      hint = password.strip == confirmation.strip ? " (one of them has extra spaces at the start or end)" : ""
      remaining = attempts - attempt - 1
      warn "Passwords don't match#{hint}.#{remaining.positive? ? " Try again (#{remaining} left)." : ''}"
    end
    abort "Giving up: the passwords didn't match."
  end

  # Removes what terminals can add around typed or pasted text: bracketed-paste markers
  # (ESC[200~ ... ESC[201~) and trailing carriage returns/newlines. Other characters are kept.
  def clean_terminal_input(text)
    text.gsub(/\e\[20[01]~/, "").delete_suffix("\n").delete_suffix("\r")
  end
end
