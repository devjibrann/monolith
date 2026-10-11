class Api::V1::ReportsController < Api::V1::BaseController
  before_action :ensure_tenant!

  # GET /api/v1/reports/chats/download?export_format=csv|json&scope=self|organization
  def chats_download
    export_format = params[:export_format].presence_in(%w[csv json]) || "csv"
    scope = params[:scope].presence_in(%w[self organization]) || "self"

    if scope == "organization" && !privileged_member?
      return render json: { error: "Only admins or owners can export organization-wide chats" }, status: :forbidden
    end

    result = ReportingServiceClient.export_chats(
      organization_id: ActsAsTenant.current_tenant.id,
      user_id: scope == "self" ? current_user.id : nil,
      format: export_format
    )

    send_data result[:body],
      filename: result[:filename],
      type: result[:content_type],
      disposition: "attachment"
  rescue ReportingServiceClient::Error => e
    render json: { error: e.message }, status: :service_unavailable
  end

  # GET /api/v1/reports/chats/observations?days=30
  def chat_observations
    unless privileged_member?
      return render json: { error: "Only admins or owners can view chat observations" }, status: :forbidden
    end

    days = params.fetch(:days, 30).to_i.clamp(1, 365)
    render json: ReportingServiceClient.chat_observations(
      organization_id: ActsAsTenant.current_tenant.id,
      days: days
    )
  rescue ReportingServiceClient::Error => e
    render json: { error: e.message }, status: :service_unavailable
  end

  private

  def privileged_member?
    membership = current_user.memberships.find_by(organization: ActsAsTenant.current_tenant)
    membership.present? && (membership.admin? || membership.owner?)
  end
end
