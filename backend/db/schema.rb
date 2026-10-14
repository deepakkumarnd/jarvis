# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_14_053809) do
  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "api_key_pairs", force: :cascade do |t|
    t.text "api_key", null: false
    t.text "secret_key", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "bookmarks", force: :cascade do |t|
    t.string "name", null: false
    t.string "link", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_bookmarks_on_name"
  end

  create_table "credential_groups", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_credential_groups_on_name"
    t.index ["updated_at"], name: "index_credential_groups_on_updated_at"
  end

  create_table "credentials", force: :cascade do |t|
    t.integer "credential_group_id", null: false
    t.string "name", null: false
    t.string "secretable_type", null: false
    t.integer "secretable_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["credential_group_id"], name: "index_credentials_on_credential_group_id"
    t.index ["name"], name: "index_credentials_on_name"
    t.index ["secretable_type", "secretable_id"], name: "index_credentials_on_secretable", unique: true
  end

  create_table "document_files", force: :cascade do |t|
    t.integer "document_id", null: false
    t.string "filename", null: false
    t.string "content_type", null: false
    t.bigint "byte_size", null: false
    t.string "checksum", null: false
    t.text "encryption_key", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["document_id"], name: "index_document_files_on_document_id"
    t.index ["filename"], name: "index_document_files_on_filename"
  end

  create_table "documents", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_documents_on_name"
    t.index ["updated_at"], name: "index_documents_on_updated_at"
  end

  create_table "notes", force: :cascade do |t|
    t.string "title", null: false
    t.text "body", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["updated_at"], name: "index_notes_on_updated_at"
  end

  create_table "secret_texts", force: :cascade do |t|
    t.text "secret", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "settings", force: :cascade do |t|
    t.string "brand_name", default: "Namnik", null: false
    t.string "tagline", default: "Personal assistant for Deepak", null: false
    t.integer "singleton_guard", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["singleton_guard"], name: "index_settings_on_singleton_guard", unique: true
  end

  create_table "todos", force: :cascade do |t|
    t.string "title", null: false
    t.boolean "completed", default: false, null: false
    t.date "due_on"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["completed", "due_on"], name: "index_todos_on_completed_and_due_on"
  end

  create_table "username_passwords", force: :cascade do |t|
    t.text "username", null: false
    t.text "password", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "credentials", "credential_groups"
  add_foreign_key "document_files", "documents"
end
