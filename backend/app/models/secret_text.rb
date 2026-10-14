class SecretText < ApplicationRecord
  include Secretable

  credential_fields secret: %i[ secret ], max_length: 100_000
end
