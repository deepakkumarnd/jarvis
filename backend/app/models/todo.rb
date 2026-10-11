class Todo < ApplicationRecord
  STATUSES = %w[ all active completed ].freeze

  validates :title, presence: true, length: { maximum: 500 }
  validates :completed, inclusion: { in: [ true, false ] }

  scope :active, -> { where(completed: false) }
  scope :completed, -> { where(completed: true) }
  scope :with_status, ->(status) { status.in?(%w[ active completed ]) ? public_send(status) : all }

  # Open todos first, soonest due date first (undated last), then newest
  scope :in_display_order, -> {
    order(:completed, arel_table[:due_on].asc.nulls_last, created_at: :desc, id: :desc)
  }

  def self.status_counts
    completed_count = completed.count
    total = count
    { "all" => total, "active" => total - completed_count, "completed" => completed_count }
  end
end
