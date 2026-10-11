require "rails_helper"

RSpec.describe Note, type: :model do
  describe "validations" do
    it "is valid with a title and Markdown body" do
      expect(build(:note)).to be_valid
    end

    it "requires a title" do
      note = build(:note, title: "")
      expect(note).not_to be_valid
      expect(note.errors[:title]).to include("can't be blank")
    end

    it "allows an empty body" do
      expect(build(:note, body: "")).to be_valid
    end

    it "stores a nil body as an empty string" do
      expect(create(:note, body: nil).reload.body).to eq("")
    end

    it "rejects titles longer than 255 characters" do
      expect(build(:note, title: "a" * 256)).not_to be_valid
    end

    it "rejects bodies longer than 100,000 characters" do
      expect(build(:note, body: "a" * 100_001)).not_to be_valid
    end
  end

  describe "#preview" do
    it "returns the whole body when it is short" do
      note = build(:note, body: "Short **note**")
      expect(note.preview).to eq("Short **note**")
      expect(note.preview_truncated?).to be(false)
    end

    it "truncates long bodies on a word boundary" do
      note = build(:note, body: Faker::Lorem.paragraph_by_chars(number: 2_000))

      expect(note.preview.length).to be <= Note::PREVIEW_LENGTH
      expect(note.preview).to end_with("…")
      expect(note.preview_truncated?).to be(true)
    end
  end

  describe "#as_summary_json" do
    it "replaces the body with a preview" do
      note = create(:note)
      expect(note.as_summary_json.keys).to contain_exactly("id", "title", "preview", "truncated", "created_at", "updated_at")
    end
  end
end
