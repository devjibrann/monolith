class Api::V1::ChatsController < Api::V1::BaseController
  include ActionController::Live

  before_action :ensure_tenant!

  def index
    messages = ChatMessage.order(created_at: :asc).last(50)
    render json: messages.map { |m| serialize_message(m) }
  end

  def create
    message = params.require(:message).to_s.strip
    if message.blank?
      return render json: { error: "message is required" }, status: :unprocessable_entity
    end

    organization = ActsAsTenant.current_tenant
    ChatMessage.create!(user: current_user, role: "user", content: message, organization: organization)

    begin
      context = RagRetriever.retrieve(organization: organization, query: message)
    rescue StandardError => e
      return render json: { error: e.message }, status: :service_unavailable
    end

    response.headers["Content-Type"] = "text/event-stream"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Last-Modified"] = Time.now.httpdate
    response.headers["X-Accel-Buffering"] = "no"

    assistant = +""

    begin
      AiServiceClient.stream_chat(message: message, context: context) do |delta|
        assistant << delta
        response.stream.write("data: #{JSON.generate({ token: delta })}\n\n")
      end

      ChatMessage.create!(
        user: current_user,
        role: "assistant",
        content: assistant.presence || "(no response)",
        organization: organization
      )
      response.stream.write("data: [DONE]\n\n")
    rescue AiServiceClient::Error => e
      response.stream.write("data: #{JSON.generate({ error: e.message })}\n\n")
    ensure
      response.stream.close
    end
  end

  private

  def serialize_message(message)
    {
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at
    }
  end
end
