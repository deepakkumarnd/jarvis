class CreateTodos < ActiveRecord::Migration[8.1]
  def change
    create_table :todos do |t|
      t.string :title, null: false
      t.boolean :completed, null: false, default: false
      t.date :due_on

      t.timestamps
    end
    add_index :todos, [ :completed, :due_on ]
  end
end
