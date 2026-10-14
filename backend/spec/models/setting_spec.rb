require "rails_helper"

RSpec.describe Setting, type: :model do
  describe ".current" do
    it "creates the row with defaults on first use" do
      expect { described_class.current }.to change(described_class, :count).from(0).to(1)
      expect(described_class.current).to have_attributes(brand_name: "Namnik", tagline: "Personal assistant for Deepak")
    end

    it "returns the same row afterwards" do
      expect(described_class.current).to eq(described_class.current)
      expect(described_class.count).to eq(1)
    end
  end

  it "can only ever have one row" do
    described_class.current
    expect { described_class.new.save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it "requires a brand name" do
    setting = described_class.current
    expect(setting.update(brand_name: "  ")).to be(false)
    expect(setting.errors[:brand_name]).to include("can't be blank")
  end

  it "allows an empty tagline" do
    expect(described_class.current.update(tagline: "")).to be(true)
  end

  it "limits lengths" do
    setting = described_class.current
    expect(setting.update(brand_name: "a" * 51)).to be(false)
    expect(setting.update(brand_name: "ok", tagline: "a" * 121)).to be(false)
  end

  it "strips whitespace" do
    setting = described_class.current
    setting.update!(brand_name: "  Friday  ")
    expect(setting.brand_name).to eq("Friday")
  end
end
