class CreateSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :sessions do |t|
      t.references :user, null: false, foreign_key: true
      # SHA-256 of the random token held in the browser cookie; the token itself is never stored
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.string :ip_address
      t.string :user_agent

      t.timestamps
    end
    add_index :sessions, :token_digest, unique: true
    add_index :sessions, :expires_at
  end
end
