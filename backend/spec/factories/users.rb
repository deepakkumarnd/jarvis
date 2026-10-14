FactoryBot.define do
  factory :user do
    username { "deepak" }
    password { AuthHelpers::PASSWORD }
  end
end
