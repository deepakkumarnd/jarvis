require "rails_helper"

RSpec.describe "Api::Bookmarks", type: :request do
  let(:json) { response.parsed_body }

  describe "GET /api/bookmarks" do
    it "lists bookmarks, newest first" do
      older = create(:bookmark, created_at: 1.day.ago)
      newer = create(:bookmark)

      get api_bookmarks_path, as: :json

      expect(response).to have_http_status(:ok)
      expect(json.pluck("id")).to eq([ newer.id, older.id ])
    end
  end

  describe "GET /api/bookmarks/:id" do
    it "returns the bookmark" do
      bookmark = create(:bookmark)

      get api_bookmark_path(bookmark), as: :json

      expect(response).to have_http_status(:ok)
      expect(json).to include("id" => bookmark.id, "name" => bookmark.name, "link" => bookmark.link)
    end

    it "returns 404 when the bookmark does not exist" do
      get api_bookmark_path(id: 0), as: :json

      expect(response).to have_http_status(:not_found)
      expect(json).to eq("error" => "Not found")
    end
  end

  describe "POST /api/bookmarks" do
    it "creates a bookmark" do
      attrs = attributes_for(:bookmark)

      expect {
        post api_bookmarks_path, params: { bookmark: attrs }, as: :json
      }.to change(Bookmark, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json).to include("name" => attrs[:name], "link" => attrs[:link])
      expect(response.location).to eq(api_bookmark_url(json["id"]))
    end

    it "returns errors for invalid input" do
      expect {
        post api_bookmarks_path, params: { bookmark: { name: "", link: "nope" } }, as: :json
      }.not_to change(Bookmark, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"].keys).to contain_exactly("name", "link")
    end

    it "accepts attributes without the bookmark wrapper key" do
      attrs = attributes_for(:bookmark)

      post api_bookmarks_path, params: attrs, as: :json

      expect(response).to have_http_status(:created)
      expect(json).to include("name" => attrs[:name], "link" => attrs[:link])
    end
  end

  describe "PATCH /api/bookmarks/:id" do
    let(:bookmark) { create(:bookmark) }

    it "updates the bookmark" do
      new_name = Faker::Lorem.sentence(word_count: 2)

      patch api_bookmark_path(bookmark), params: { bookmark: { name: new_name } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(bookmark.reload.name).to eq(new_name)
    end

    it "rejects an invalid link" do
      patch api_bookmark_path(bookmark), params: { bookmark: { link: "ftp://example.com" } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]).to have_key("link")
    end
  end

  describe "DELETE /api/bookmarks/:id" do
    it "deletes the bookmark" do
      bookmark = create(:bookmark)

      expect {
        delete api_bookmark_path(bookmark), as: :json
      }.to change(Bookmark, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end

  describe "GET /api/bookmarks/search" do
    it "returns bookmarks whose name matches, ignoring case" do
      create(:bookmark, name: "Rails Guides")
      create(:bookmark, name: "Vite Docs")

      get search_api_bookmarks_path(q: "VITE"), as: :json

      expect(response).to have_http_status(:ok)
      expect(json.pluck("name")).to eq([ "Vite Docs" ])
    end

    it "returns 400 without a query" do
      get search_api_bookmarks_path, as: :json

      expect(response).to have_http_status(:bad_request)
    end
  end
end
