FactoryBot.define do
  factory :note do
    title { Faker::Lorem.sentence(word_count: 3).chomp(".") }
    body { "## #{Faker::Lorem.words(number: 2).join(' ')}\n\n#{Faker::Markdown.random}\n\n#{Faker::Lorem.paragraph}" }
  end
end
