class CreateSecretTexts < ActiveRecord::Migration[8.1]
  def change
    create_table :secret_texts do |t|
      t.text :secret, null: false # encrypted

      t.timestamps
    end
  end
end
