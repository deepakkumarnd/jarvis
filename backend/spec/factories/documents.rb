FactoryBot.define do
  factory :document do
    name { Faker::Lorem.words(number: 3).join(" ").titleize }

    transient do
      # Each entry: { filename:, content:, content_type: } or just a filename
      files { [ { filename: "#{Faker::File.file_name(dir: '', ext: 'txt').delete_prefix('/')}", content: Faker::Lorem.paragraph } ] }
    end

    after(:build) do |document, evaluator|
      evaluator.files.each do |spec|
        spec = { filename: spec } if spec.is_a?(String)
        upload = Rack::Test::UploadedFile.new(
          StringIO.new(spec.fetch(:content) { Faker::Lorem.paragraph }),
          spec.fetch(:content_type, "application/octet-stream"),
          original_filename: spec.fetch(:filename)
        )
        document.files << DocumentFile.from_upload(upload, document: document)
      end
    end
  end
end
