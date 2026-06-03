require "pdf/reader"

class DocumentTextExtractor
  TEXT_TYPES = %w[text/plain text/markdown application/json].freeze
  PDF_TYPES = %w[application/pdf].freeze
  TEXT_EXTENSIONS = /\.(txt|md|markdown|json)$/i
  PDF_EXTENSION = /\.pdf$/i

  def self.extract(attachment)
    blob = attachment.blob
    raise ArgumentError, "file not attached" unless blob

    text =
      if pdf_file?(blob)
        extract_pdf(blob)
      elsif text_file?(blob)
        extract_text(blob)
      else
        raise ArgumentError,
              "unsupported file type: #{blob.content_type}. Upload PDF, TXT, or Markdown."
      end

    normalized = sanitize_extracted_text(text)
    raise ArgumentError, "no extractable text in file" if normalized.blank?

    normalized
  end

  # PostgreSQL text columns reject NUL (\0); pdf-reader sometimes leaves them in extracted text.
  def self.sanitize_extracted_text(text)
    text.to_s
      .encode(Encoding::UTF_8, invalid: :replace, undef: :replace)
      .delete("\u0000")
      .strip
  end

  def self.supported?(blob)
    text_file?(blob) || pdf_file?(blob)
  end

  def self.text_file?(blob)
    TEXT_TYPES.include?(blob.content_type) || blob.filename.to_s.match?(TEXT_EXTENSIONS)
  end

  def self.pdf_file?(blob)
    PDF_TYPES.include?(blob.content_type) || blob.filename.to_s.match?(PDF_EXTENSION)
  end

  def self.extract_text(blob)
    blob.download.force_encoding(Encoding::UTF_8)
  end

  def self.extract_pdf(blob)
    io = StringIO.new(blob.download)
    reader = PDF::Reader.new(io)
    pages = reader.pages.map { |page| page.text.to_s.strip }.reject(&:blank?)
    raise ArgumentError, "PDF has no extractable text (scanned images are not supported yet)" if pages.empty?

    pages.join("\n\n")
  rescue PDF::Reader::MalformedPDFError => e
    raise ArgumentError, "could not read PDF: #{e.message}"
  end

end
