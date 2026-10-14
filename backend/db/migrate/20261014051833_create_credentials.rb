class CreateCredentials < ActiveRecord::Migration[8.1]
  def change
    create_table :credentials do |t|
      t.references :credential_group, null: false, foreign_key: true
      t.string :name, null: false
      # delegated_type: UsernamePassword, ApiKeyPair or SecretText
      t.references :secretable, polymorphic: true, null: false, index: { unique: true }

      t.timestamps
    end
    add_index :credentials, :name
  end
end
