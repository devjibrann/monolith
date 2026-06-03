class Api::V1::BaseController < ApplicationController
  include Pundit::Authorization

  before_action :authenticate_api_user!
  before_action :set_current_tenant

  def ensure_tenant!
    return if ActsAsTenant.current_tenant

    render json: { error: "X-Organization-Slug header is required" }, status: :bad_request
  end

  private

  def authenticate_api_user!
    @current_user = warden.authenticate(scope: :user)
    @current_user ||= user_from_bearer_token
    return if @current_user

    render json: { error: "Unauthorized" }, status: :unauthorized
  end

  def current_user
    @current_user
  end

  def set_current_tenant
    org_slug = request.headers["X-Organization-Slug"]
    return unless org_slug

    organization = current_user.organizations.find_by!(slug: org_slug)
    ActsAsTenant.current_tenant = organization
  end

  def user_from_bearer_token
    auth = request.headers["Authorization"].to_s
    return nil unless auth.start_with?("Bearer ")

    token = auth.delete_prefix("Bearer ").strip
    payload = Warden::JWTAuth::TokenDecoder.new.call(token)
    User.find_by(id: payload["sub"])
  rescue JWT::DecodeError, JWT::VerificationError
    nil
  end
end
