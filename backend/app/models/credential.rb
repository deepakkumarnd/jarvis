# A named credential within a group. The values live in a delegated (polymorphic)
# record whose type determines the fields:
#
#   username_password -> UsernamePassword (username, password)
#   api_key           -> ApiKeyPair       (api_key, secret_key)
#   secret_text       -> SecretText       (secret)
class Credential < ApplicationRecord
  KINDS = {
    "username_password" => "UsernamePassword",
    "api_key" => "ApiKeyPair",
    "secret_text" => "SecretText"
  }.freeze

  belongs_to :credential_group, touch: true, inverse_of: :credentials
  delegated_type :secretable, types: KINDS.values, dependent: :destroy, autosave: true

  validates :name, presence: true, length: { maximum: 255 }
  validates_associated :secretable

  def self.kind_for(secretable_type) = KINDS.key(secretable_type)

  # Builds a credential of +kind+ with its typed record, e.g.
  #   Credential.build_of_kind("api_key", name: "Stripe", fields: { api_key: "pk", secret_key: "sk" })
  def self.build_of_kind(kind, name:, fields:, group: nil)
    type = KINDS[kind.to_s] or return nil
    klass = type.constantize
    new(credential_group: group, name: name, secretable: klass.new(fields.to_h.slice(*klass.fields)))
  end

  def kind = self.class.kind_for(secretable_type)

  # Updates the name and any provided fields. Blank secret fields are ignored so the
  # client can edit a credential without re-sending (or ever having fetched) its secret.
  def update_with_fields(name:, fields:)
    fields = fields.to_h.slice(*secretable.class.fields)
    fields = fields.reject { |key, value| value.blank? && secretable.class.secret_fields.include?(key) }
    self.name = name unless name.nil?
    secretable.assign_attributes(fields)
    save
  end

  def as_json(*)
    {
      "id" => id,
      "name" => name,
      "kind" => kind,
      "fields" => secretable.revealed_attributes,
      "secret_fields" => secretable.class.secret_fields,
      "created_at" => created_at,
      "updated_at" => updated_at
    }
  end

  def secret_json
    { "id" => id, "secrets" => secretable.secret_attributes }
  end
end
