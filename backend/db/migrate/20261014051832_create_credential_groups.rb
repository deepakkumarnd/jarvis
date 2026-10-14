class CreateCredentialGroups < ActiveRecord::Migration[8.1]
  def change
    create_table :credential_groups do |t|
      t.string :name, null: false

      t.timestamps
    end
    add_index :credential_groups, :name
    add_index :credential_groups, :updated_at
  end
end
