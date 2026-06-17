class RagRetriever
  VECTOR_LIMIT = 8
  KEYWORD_LIMIT = 5
  FINAL_LIMIT = 5

  def self.retrieve(organization:, user:, query:)
    new(organization: organization, user: user, query: query).retrieve
  end

  def initialize(organization:, user:, query:)
    @organization = organization
    @user = user
    @query = query.to_s.strip
  end

  def retrieve
    return [] if @query.blank?

    visible_doc_ids = Document.visible_to(@user, @organization).pluck(:id)
    return [] if visible_doc_ids.empty?

    ActsAsTenant.with_tenant(@organization) do
      embedding = AiServiceClient.embed_texts([ @query ]).first
      vector_hits = vector_search(visible_doc_ids, embedding)
      keyword_hits = keyword_search(visible_doc_ids)
      rank_and_limit(vector_hits, keyword_hits)
    end
  end

  private

  def vector_search(document_ids, embedding)
    DocumentChunk
      .where(document_id: document_ids)
      .nearest_neighbors(:embedding, embedding, distance: "cosine")
      .includes(:document)
      .limit(VECTOR_LIMIT)
      .map { |chunk| serialize_chunk(chunk, score: 1.0 - chunk.neighbor_distance.to_f, match: "vector") }
  end

  def keyword_search(document_ids)
    terms = @query.downcase.split(/\s+/).map { |term| term.gsub(/[^a-z0-9]/i, "") }.reject { |t| t.length < 3 }
    return [] if terms.empty?

    pattern = "%#{ActiveRecord::Base.sanitize_sql_like(terms.join(' '))}%"
    DocumentChunk
      .where(document_id: document_ids)
      .where("LOWER(content) LIKE ?", pattern)
      .includes(:document)
      .limit(KEYWORD_LIMIT)
      .map { |chunk| serialize_chunk(chunk, score: 0.55, match: "keyword") }
  end

  def rank_and_limit(vector_hits, keyword_hits)
    merged = {}

    (vector_hits + keyword_hits).each do |hit|
      existing = merged[hit[:chunk_id]]
      if existing.nil? || hit[:score] > existing[:score]
        merged[hit[:chunk_id]] = hit
      elsif existing[:match] != hit[:match]
        merged[hit[:chunk_id]] = existing.merge(
          score: [ existing[:score] + 0.15, 1.0 ].min,
          match: "hybrid"
        )
      end
    end

    merged.values.sort_by { |hit| -hit[:score] }.first(FINAL_LIMIT)
  end

  def serialize_chunk(chunk, score:, match:)
    {
      chunk_id: chunk.id,
      document_id: chunk.document_id,
      document_title: chunk.document.title,
      content: chunk.content,
      score: score.round(4),
      match: match
    }
  end
end
