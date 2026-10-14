class UsernamePassword < ApplicationRecord
  include Secretable

  credential_fields revealed: %i[ username ], secret: %i[ password ], max_length: 1_000
end
