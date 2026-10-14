class ApiKeyPair < ApplicationRecord
  include Secretable

  credential_fields revealed: %i[ api_key ], secret: %i[ secret_key ], max_length: 10_000
end
