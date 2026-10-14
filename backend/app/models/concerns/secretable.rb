# Shared behaviour for the record types a Credential delegates to.
#
# Every field is encrypted at rest. Fields listed in +revealed_fields+ are identifiers
# (e.g. a username) returned whenever the credential is shown; +secret_fields+ are only
# returned by the explicit "view secret" endpoint.
module Secretable
  extend ActiveSupport::Concern

  included do
    has_one :credential, as: :secretable, touch: true, inverse_of: :secretable
  end

  class_methods do
    attr_reader :revealed_fields, :secret_fields

    def credential_fields(revealed: [], secret:, max_length: 10_000)
      @revealed_fields = revealed.map(&:to_s)
      @secret_fields = secret.map(&:to_s)
      encrypts(*revealed, *secret)
      validates(*revealed, *secret, presence: true, length: { maximum: max_length })
    end

    def fields = revealed_fields + secret_fields
  end

  def revealed_attributes = slice(*self.class.revealed_fields)
  def secret_attributes = slice(*self.class.secret_fields)
end
