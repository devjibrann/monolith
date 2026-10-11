class ReportingServiceClient
  class Error < StandardError; end

  def self.base_url
    ENV.fetch("REPORTING_SERVICE_URL", "http://localhost:8100")
  end

  def self.secret
    ENV.fetch("REPORTING_SERVICE_SECRET", "development-reporting-secret-change-in-production")
  end

  def self.connection
    @connection ||= Faraday.new(url: base_url) do |f|
      f.options.timeout = 60
      f.options.open_timeout = 5
      f.headers["X-Internal-Secret"] = secret
    end
  end

  # Returns { body:, content_type:, filename: } for a downloadable transcript.
  def self.export_chats(organization_id:, user_id: nil, format: "csv")
    response = connection.get("/internal/reports/chats/export") do |req|
      req.params["organization_id"] = organization_id
      req.params["user_id"] = user_id if user_id
      req.params["format"] = format
    end
    raise Error, extract_error(response) unless response.success?

    disposition = response.headers["content-disposition"].to_s
    filename = disposition[/filename="([^"]+)"/, 1] || "chat-report.#{format}"

    {
      body: response.body,
      content_type: response.headers["content-type"] || "application/octet-stream",
      filename: filename
    }
  rescue Faraday::Error => e
    raise Error, "Reporting service unreachable: #{e.message}"
  end

  def self.chat_observations(organization_id:, days: 30)
    response = connection.get("/internal/reports/chats/observations") do |req|
      req.params["organization_id"] = organization_id
      req.params["days"] = days
    end
    raise Error, extract_error(response) unless response.success?

    JSON.parse(response.body)
  rescue Faraday::Error => e
    raise Error, "Reporting service unreachable: #{e.message}"
  rescue JSON::ParserError => e
    raise Error, "Reporting service returned invalid JSON: #{e.message}"
  end

  def self.extract_error(response)
    body = response.body
    parsed = body.is_a?(String) ? (JSON.parse(body) rescue nil) : body
    if parsed.is_a?(Hash)
      detail = parsed["detail"]
      return detail if detail.is_a?(String)
      return detail.filter_map { |item| item["msg"] if item.is_a?(Hash) }.join(", ") if detail.is_a?(Array)
    end
    "Reporting service error (#{response.status})"
  end
  private_class_method :extract_error
end
