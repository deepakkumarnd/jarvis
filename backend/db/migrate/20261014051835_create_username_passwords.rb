class CreateUsernamePasswords < ActiveRecord::Migration[8.1]
  def change
    create_table :username_passwords do |t|
      t.text :username, null: false # encrypted
      t.text :password, null: false # encrypted

      t.timestamps
    end
  end
end
