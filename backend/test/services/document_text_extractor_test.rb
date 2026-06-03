require "test_helper"

class DocumentTextExtractorTest < ActiveSupport::TestCase
  test "sanitize_extracted_text removes null bytes" do
    raw = "DCDC\u0000RATE\u0000table"
    assert_equal "DCDCRATEtable", DocumentTextExtractor.sanitize_extracted_text(raw)
  end

  test "sanitize_extracted_text normalizes invalid utf8" do
    raw = "ok\xff\xfe".force_encoding(Encoding::UTF_8)
    result = DocumentTextExtractor.sanitize_extracted_text(raw)
    assert result.valid_encoding?
    assert_includes result, "ok"
  end
end
