class CreateBookmarks < ActiveRecord::Migration[8.1]
  def change
    create_table :bookmarks do |t|
      t.string :name, null: false
      t.string :link, null: false

      t.timestamps
    end
    add_index :bookmarks, :name
  end
end
