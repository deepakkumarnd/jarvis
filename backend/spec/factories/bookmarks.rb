FactoryBot.define do
  factory :bookmark do
    name { Faker::Lorem.words(number: 3).join(" ").titleize }
    link { Faker::Internet.url }
  end
end
