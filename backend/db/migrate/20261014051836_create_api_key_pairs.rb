class CreateApiKeyPairs < ActiveRecord::Migration[8.1]
  def change
    create_table :api_key_pairs do |t|
      t.text :api_key, null: false # encrypted
      t.text :secret_key, null: false # encrypted

      t.timestamps
    end
  end
end
