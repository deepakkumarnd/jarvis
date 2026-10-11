require "rails_helper"

RSpec.describe Todo, type: :model do
  describe "validations" do
    it "is valid with a title" do
      expect(build(:todo)).to be_valid
    end

    it "requires a title" do
      todo = build(:todo, title: " ")
      expect(todo).not_to be_valid
      expect(todo.errors[:title]).to include("can't be blank")
    end

    it "rejects titles longer than 500 characters" do
      expect(build(:todo, title: "a" * 501)).not_to be_valid
    end

    it "defaults to not completed" do
      expect(described_class.new.completed).to be(false)
    end
  end

  describe ".in_display_order" do
    it "lists open todos first, soonest due first, undated last, then newest" do
      done = create(:todo, :completed, due_on: Date.current)
      undated_old = create(:todo, created_at: 2.days.ago)
      undated_new = create(:todo, created_at: 1.day.ago)
      due_later = create(:todo, due_on: Date.current + 5)
      due_soon = create(:todo, due_on: Date.current + 1)

      expect(described_class.in_display_order).to eq([ due_soon, due_later, undated_new, undated_old, done ])
    end
  end

  describe ".with_status" do
    let!(:open_todo) { create(:todo) }
    let!(:done_todo) { create(:todo, :completed) }

    it "filters by status" do
      expect(described_class.with_status("active")).to contain_exactly(open_todo)
      expect(described_class.with_status("completed")).to contain_exactly(done_todo)
      expect(described_class.with_status("all")).to contain_exactly(open_todo, done_todo)
    end
  end

  describe ".status_counts" do
    it "counts todos per status" do
      create_list(:todo, 2)
      create(:todo, :completed)

      expect(described_class.status_counts).to eq("all" => 3, "active" => 2, "completed" => 1)
    end
  end
end
