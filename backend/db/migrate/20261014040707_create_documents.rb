class CreateDocuments < ActiveRecord::Migration[8.1]
  def change
    create_table :documents do |t|
      t.string :name, null: false

      t.timestamps
    end
    add_index :documents, :name
    add_index :documents, :updated_at
  end
end
