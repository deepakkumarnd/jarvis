class CreateNotes < ActiveRecord::Migration[8.1]
  def change
    create_table :notes do |t|
      t.string :title, null: false
      t.text :body, null: false, default: ""

      t.timestamps
    end
    add_index :notes, :updated_at
  end
end
