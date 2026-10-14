class CreateSettings < ActiveRecord::Migration[8.1]
  def change
    create_table :settings do |t|
      t.string :brand_name, null: false, default: "Namnik"
      t.string :tagline, null: false, default: "Personal assistant for Deepak"
      # Always 0 with a unique index, so the table can only ever hold one row
      t.integer :singleton_guard, null: false, default: 0

      t.timestamps
    end
    add_index :settings, :singleton_guard, unique: true
  end
end
