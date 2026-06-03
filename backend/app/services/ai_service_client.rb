class AiServiceClient
  class Error < StandardError; end

  def self.base_url
    ENV.fetch("AI_SERVICE_URL", "http://localhost:8000")
  end

  def self.secret
    ENV.fetch("AI_SERVICE_SECRET", "development-ai-secret-change-in-production")
  end

  def self.connection
    @connection ||= Faraday.new(url: base_url) do |f|
      f.request :json
      f.response :json
      f.options.timeout = 120
      f.options.open_timeout = 5
      f.headers["X-Internal-Secret"] = secret
    end
  end

  def self.embed_texts(texts)
    response = connection.post("/internal/embeddings", { texts: texts })
    raise Error, extract_error(response) unless response.success?

    response.body.fetch("embeddings")
  end

  def self.stream_chat(message:, context:)
    conn = Faraday.new(url: base_url) do |f|
      f.options.timeout = 300
      f.headers["X-Internal-Secret"] = secret
      f.headers["Content-Type"] = "application/json"
      f.headers["Accept"] = "text/event-stream"
    end

    buffer = +""

    conn.post("/internal/chat/stream") do |req|
      req.body = { message: message, context: context }.to_json
      req.options.on_data = proc do |chunk, _size|
        buffer << chunk
        while (line = buffer.slice!(/\A[^\n]*\n/))
          line = line.chomp
          next if line.empty? || line.start_with?("event:")

          if line.start_with?("data:")
            # Do not strip trailing spaces; tokens often end with a space.
            payload = line.delete_prefix("data:")
            payload = payload[1..] if payload.start_with?(" ")
            yield payload unless payload == "[DONE]"
          end
        end
      end
    end
  rescue Faraday::Error => e
    raise Error, e.message
  end

  def self.extract_error(response)
    body = response.body
    return body.strip if body.is_a?(String) && body.present?
    return body.to_s unless body.is_a?(Hash)

    detail = body["detail"]
    if detail.is_a?(String)
      detail
    elsif detail.is_a?(Array)
      detail.filter_map { |item| item["msg"] if item.is_a?(Hash) }.join(", ")
    else
      body["error"] || "AI service error (#{response.status})"
    end
  end
  private_class_method :extract_error
end
