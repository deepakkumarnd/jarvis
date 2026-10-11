require "rails_helper"

RSpec.describe "Api::Notes", type: :request do
  let(:json) { response.parsed_body }

  describe "GET /api/notes" do
    it "lists notes with previews, most recently updated first" do
      older = create(:note, updated_at: 1.day.ago)
      newer = create(:note)

      get api_notes_path, as: :json

      expect(response).to have_http_status(:ok)
      expect(json["data"].pluck("id")).to eq([ newer.id, older.id ])
      expect(json["data"].first).to include("title" => newer.title, "preview" => newer.preview)
      expect(json["data"].first).not_to have_key("body")
      expect(json["meta"]).to eq("page" => 1, "per_page" => 50, "total_count" => 2, "total_pages" => 1)
    end

    it "marks long notes as truncated" do
      create(:note, body: Faker::Lorem.paragraph_by_chars(number: 2_000))

      get api_notes_path, as: :json

      expect(json["data"].first["truncated"]).to be(true)
    end

    it "paginates 50 notes per page" do
      create_list(:note, 51)

      get api_notes_path(page: 2), as: :json

      expect(json["data"].size).to eq(1)
      expect(json["meta"]).to include("page" => 2, "total_count" => 51, "total_pages" => 2)
    end
  end

  describe "GET /api/notes/:id" do
    it "returns the full note" do
      note = create(:note)

      get api_note_path(note), as: :json

      expect(response).to have_http_status(:ok)
      expect(json).to include("id" => note.id, "title" => note.title, "body" => note.body)
    end

    it "returns 404 when the note does not exist" do
      get api_note_path(id: 0), as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/notes" do
    it "creates a note" do
      attrs = attributes_for(:note)

      expect {
        post api_notes_path, params: { note: attrs }, as: :json
      }.to change(Note, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json).to include("title" => attrs[:title], "body" => attrs[:body])
    end

    it "returns errors for a missing title" do
      expect {
        post api_notes_path, params: { note: { title: "", body: Faker::Lorem.paragraph } }, as: :json
      }.not_to change(Note, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]).to have_key("title")
    end
  end

  describe "PATCH /api/notes/:id" do
    let(:note) { create(:note) }

    it "updates the note" do
      body = "# #{Faker::Lorem.word}\n\n- #{Faker::Lorem.sentence}"

      patch api_note_path(note), params: { note: { body: body } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(note.reload.body).to eq(body)
    end

    it "rejects a blank title" do
      patch api_note_path(note), params: { note: { title: " " } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "DELETE /api/notes/:id" do
    it "deletes the note" do
      note = create(:note)

      expect {
        delete api_note_path(note), as: :json
      }.to change(Note, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
