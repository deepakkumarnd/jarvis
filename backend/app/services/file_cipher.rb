require "openssl"
require "stringio"

# Authenticated encryption for file contents (AES-256-GCM).
#
# Output layout: 12-byte nonce | ciphertext | 16-byte auth tag. Decryption raises
# FileCipher::Error if the data or key is wrong or the ciphertext was tampered with.
#
# The stream methods work in fixed-size chunks so large files never sit in memory whole.
module FileCipher
  ALGORITHM = "aes-256-gcm"
  NONCE_BYTES = 12
  TAG_BYTES = 16
  CHUNK_BYTES = 1.megabyte

  class Error < StandardError; end

  module_function

  def generate_key
    OpenSSL::Cipher.new(ALGORITHM).random_key
  end

  # Encrypts +input+ (an IO) into +output+ (an IO). Yields each plaintext chunk, e.g. to hash it.
  def encrypt_stream(input, output, key)
    cipher = OpenSSL::Cipher.new(ALGORITHM).encrypt
    cipher.key = key
    output.write(cipher.random_iv)
    while (chunk = input.read(CHUNK_BYTES))
      yield chunk if block_given?
      output.write(cipher.update(chunk))
    end
    output.write(cipher.final)
    output.write(cipher.auth_tag(TAG_BYTES))
    output
  end

  # Decrypts +input+ (a seekable IO, e.g. a File) into +output+, yielding each plaintext chunk.
  # The auth tag is checked at the end, so callers must discard +output+ if this raises.
  def decrypt_stream(input, output, key)
    total = input.size
    raise Error, "ciphertext too short" if total < NONCE_BYTES + TAG_BYTES

    input.seek(total - TAG_BYTES)
    tag = input.read(TAG_BYTES)
    input.seek(0)
    cipher = OpenSSL::Cipher.new(ALGORITHM).decrypt
    cipher.key = key
    cipher.iv = input.read(NONCE_BYTES)
    cipher.auth_tag = tag

    remaining = total - NONCE_BYTES - TAG_BYTES
    while remaining.positive?
      chunk = input.read([ CHUNK_BYTES, remaining ].min)
      remaining -= chunk.bytesize
      plaintext = cipher.update(chunk)
      yield plaintext if block_given?
      output.write(plaintext)
    end
    output.write(cipher.final)
    output
  rescue OpenSSL::Cipher::CipherError, ArgumentError => e
    raise Error, "could not decrypt file: #{e.message}"
  end

  def encrypt(plaintext, key)
    encrypt_stream(StringIO.new(plaintext.b), StringIO.new("".b), key).string
  end

  def decrypt(data, key)
    decrypt_stream(StringIO.new(data.b), StringIO.new("".b), key).string
  end
end
