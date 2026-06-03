require "test_helper"

class TextChunkerTest < ActiveSupport::TestCase
  test "chunks long text with overlap" do
    text = "word " * 300
    chunks = TextChunker.chunk(text, chunk_size: 100, overlap: 20)
    assert chunks.length > 1
    assert chunks.all? { |c| c.length <= 100 }
  end

  test "returns empty array for blank text" do
    assert_equal [], TextChunker.chunk("   ")
  end
end
