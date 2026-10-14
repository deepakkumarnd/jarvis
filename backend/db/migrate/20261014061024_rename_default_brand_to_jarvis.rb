class RenameDefaultBrandToJarvis < ActiveRecord::Migration[8.1]
  def up
    change_column_default :settings, :brand_name, from: "Namnik", to: "Jarvis"
    # Only rows still on the old default; a custom brand name is left alone
    execute "UPDATE settings SET brand_name = 'Jarvis' WHERE brand_name = 'Namnik'"
  end

  def down
    change_column_default :settings, :brand_name, from: "Jarvis", to: "Namnik"
    execute "UPDATE settings SET brand_name = 'Namnik' WHERE brand_name = 'Jarvis'"
  end
end
