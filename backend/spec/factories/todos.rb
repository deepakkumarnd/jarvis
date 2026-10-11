FactoryBot.define do
  factory :todo do
    title { Faker::Lorem.sentence(word_count: 4).chomp(".") }
    completed { false }
    due_on { nil }

    trait :completed do
      completed { true }
    end

    trait :due do
      due_on { Faker::Date.forward(days: 30) }
    end
  end
end
