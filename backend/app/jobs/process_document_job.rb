class ProcessDocumentJob < ApplicationJob
  queue_as :default

  def perform(document_id)
    document = ActsAsTenant.without_tenant { Document.find(document_id) }
    ActsAsTenant.with_tenant(document.organization) do
      document.update!(status: :processing, processing_error: nil)

      text = DocumentTextExtractor.extract(document.file)
      pieces = TextChunker.chunk(text)
      raise "no text content in file" if pieces.empty?

      embeddings = AiServiceClient.embed_texts(pieces)

      document.document_chunks.delete_all
      pieces.each_with_index do |content, index|
        document.document_chunks.create!(
          organization: document.organization,
          position: index,
          content: content,
          embedding: embeddings[index]
        )
      end

      document.update!(status: :ready)
    end
  rescue StandardError => e
    ActsAsTenant.without_tenant do
      Document.find_by(id: document_id)&.update(status: :failed, processing_error: e.message)
    end
    raise
  end
end
