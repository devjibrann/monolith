class TextChunker
  DEFAULT_SIZE = 800
  OVERLAP = 100

  def self.chunk(text, chunk_size: DEFAULT_SIZE, overlap: OVERLAP)
    normalized = text.to_s.gsub(/\s+/, " ").strip
    return [] if normalized.blank?

    chunks = []
    start = 0
    while start < normalized.length
      finish = [ start + chunk_size, normalized.length ].min
      chunks << normalized[start...finish].strip
      break if finish >= normalized.length

      start = finish - overlap
      start = 0 if start.negative?
    end
    chunks.reject(&:blank?)
  end
end
