require "rails_helper"

RSpec.describe Document, type: :model do
  it "requires a name" do
    document = build(:document, name: "")
    expect(document).not_to be_valid
    expect(document.errors[:name]).to include("can't be blank")
  end

  it "deletes its files and their stored ciphertext" do
    document = create(:document, files: %w[ a.txt b.txt ])

    expect { document.destroy }.to change(DocumentFile, :count).by(-2)
  end

  describe ".search" do
    let!(:tax) { create(:document, name: "Tax return 2025", files: %w[ form.pdf ]) }
    let!(:lease) { create(:document, name: "Apartment", files: %w[ Lease-Agreement.pdf ]) }

    it "matches the document name, ignoring case" do
      expect(described_class.search("TAX")).to contain_exactly(tax)
    end

    it "matches file names" do
      expect(described_class.search("lease")).to contain_exactly(lease)
    end

    it "treats wildcards literally" do
      expect(described_class.search("%")).to be_empty
    end
  end

  describe "#as_summary_json" do
    it "summarises files" do
      document = create(:document, files: [ { filename: "a.txt", content: "12345" }, { filename: "b.txt", content: "678" } ])

      expect(document.as_summary_json).to include("file_count" => 2, "total_bytes" => 8, "content_types" => [ "text/plain" ],
                                                  "filenames" => %w[ a.txt b.txt ])
    end
  end
end
