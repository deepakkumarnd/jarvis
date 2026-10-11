require "rails_helper"

RSpec.describe Bookmark, type: :model do
  describe "validations" do
    it "is valid with a name and an http(s) link" do
      expect(build(:bookmark)).to be_valid
      expect(build(:bookmark, link: Faker::Internet.url(scheme: "http"))).to be_valid
    end

    it "requires a name" do
      bookmark = build(:bookmark, name: "")
      expect(bookmark).not_to be_valid
      expect(bookmark.errors[:name]).to include("can't be blank")
    end

    it "requires a link" do
      bookmark = build(:bookmark, link: "")
      expect(bookmark).not_to be_valid
      expect(bookmark.errors[:link]).to include("can't be blank")
    end

    it "rejects non-http(s) links" do
      [ "javascript:alert(1)", "ftp://#{Faker::Internet.domain_name}", Faker::Lorem.sentence ].each do |link|
        expect(build(:bookmark, link: link)).not_to be_valid
      end
    end

    it "rejects names longer than 255 characters" do
      expect(build(:bookmark, name: "a" * 256)).not_to be_valid
    end
  end

  describe ".search_by_name" do
    let!(:rails_bookmark) { create(:bookmark, name: "Rails Guides") }
    let!(:vite_bookmark) { create(:bookmark, name: "Vite Docs") }

    it "matches part of the name, ignoring case" do
      expect(described_class.search_by_name("rAiLs")).to contain_exactly(rails_bookmark)
    end

    it "treats SQL wildcards literally" do
      expect(described_class.search_by_name("%")).to be_empty
      expect(described_class.search_by_name("_")).to be_empty
    end
  end
end
