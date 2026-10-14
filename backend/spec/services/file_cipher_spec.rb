require "rails_helper"

RSpec.describe FileCipher do
  let(:key) { described_class.generate_key }
  let(:plaintext) { Faker::Lorem.paragraph(sentence_count: 20).b }

  it "round-trips data" do
    expect(described_class.decrypt(described_class.encrypt(plaintext, key), key)).to eq(plaintext)
  end

  it "round-trips empty and binary data" do
    binary = Random.bytes(4096)
    expect(described_class.decrypt(described_class.encrypt("", key), key)).to eq("")
    expect(described_class.decrypt(described_class.encrypt(binary, key), key)).to eq(binary)
  end

  it "produces different ciphertext each time (random nonce)" do
    expect(described_class.encrypt(plaintext, key)).not_to eq(described_class.encrypt(plaintext, key))
  end

  it "does not contain the plaintext" do
    expect(described_class.encrypt(plaintext, key)).not_to include(plaintext.first(32))
  end

  it "rejects the wrong key" do
    data = described_class.encrypt(plaintext, key)
    expect { described_class.decrypt(data, described_class.generate_key) }.to raise_error(FileCipher::Error)
  end

  it "rejects tampered ciphertext" do
    data = described_class.encrypt(plaintext, key).dup
    data.setbyte(20, data.getbyte(20) ^ 0xff)
    expect { described_class.decrypt(data, key) }.to raise_error(FileCipher::Error)
  end

  it "streams files larger than one chunk" do
    data = Random.bytes((described_class::CHUNK_BYTES * 2.5).to_i)
    Tempfile.create(binmode: true) do |encrypted|
      seen = +""
      described_class.encrypt_stream(StringIO.new(data), encrypted, key) { |chunk| seen << chunk }
      expect(seen).to eq(data)

      encrypted.rewind
      decrypted = described_class.decrypt_stream(encrypted, StringIO.new("".b), key).string
      expect(decrypted).to eq(data)
      expect(encrypted.size).to eq(data.bytesize + described_class::NONCE_BYTES + described_class::TAG_BYTES)
    end
  end

  it "rejects truncated data" do
    expect { described_class.decrypt("short", key) }.to raise_error(FileCipher::Error)
  end
end
