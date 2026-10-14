FactoryBot.define do
  factory :credential_group do
    name { Faker::App.name }
  end

  factory :username_password do
    username { Faker::Internet.username }
    password { Faker::Internet.password(min_length: 16, special_characters: true) }
  end

  factory :api_key_pair do
    api_key { "pk_#{Faker::Alphanumeric.alphanumeric(number: 24)}" }
    secret_key { "sk_#{Faker::Alphanumeric.alphanumeric(number: 32)}" }
  end

  factory :secret_text do
    secret { Faker::Lorem.paragraph }
  end

  factory :credential do
    credential_group
    name { Faker::Lorem.words(number: 2).join(" ").titleize }
    secretable factory: :username_password

    trait :api_key do
      secretable factory: :api_key_pair
    end

    trait :secret_text do
      secretable factory: :secret_text
    end
  end
end
