class RagRetriever
  LIMIT = 5

  def self.retrieve(organization:, query:)
    embedding = AiServiceClient.embed_texts([query]).first
    ActsAsTenant.with_tenant(organization) do
      DocumentChunk.nearest_neighbors(:embedding, embedding, distance: "cosine")
        .includes(:document)
        .limit(LIMIT)
        .map do |chunk|
          {
            document_id: chunk.document_id,
            document_title: chunk.document.title,
            content: chunk.content,
            distance: chunk.neighbor_distance
          }
        end
    end
  end
end
