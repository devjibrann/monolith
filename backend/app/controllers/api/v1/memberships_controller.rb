class Api::V1::MembershipsController < Api::V1::BaseController
  before_action :set_membership, only: %i[show update destroy]

  def index
    memberships = if (org = organization_from_header)
                    ensure_org_member!(org)
                    org.memberships.includes(:user)
                  else
                    current_user.memberships.includes(:organization, :user)
                  end
    render json: memberships.as_json(include: { user: { only: %i[id email] }, organization: { only: %i[id name slug] } })
  end

  def show
    ensure_org_member!(@membership.organization)
    render json: @membership.as_json(include: { user: { only: %i[id email] }, organization: { only: %i[id name slug] } })
  end

  def create
    org = organization_from_header
    slug = membership_params[:organization_slug]
    org ||= Organization.find_by!(slug: slug) if slug.present?
    if org.blank?
      render json: { error: "set X-Organization-Slug or membership[organization_slug]" }, status: :unprocessable_entity
      return
    end

    ensure_org_member!(org)
    ensure_admin_or_owner!(org)

    user_id = params.dig(:membership, :user_id)
    if user_id.blank?
      return render json: { error: "membership[user_id] is required" }, status: :unprocessable_entity
    end

    user = User.find(user_id)
    role = resolve_membership_role
    return render json: { error: "invalid role" }, status: :unprocessable_entity if role.nil?

    membership = org.memberships.build(user: user, role: role)
    membership.save!
    render json: membership.as_json(include: { user: { only: %i[id email] } }), status: :created
  end

  def update
    ensure_org_member!(@membership.organization)
    ensure_admin_or_owner!(@membership.organization)

    role = resolve_membership_role
    return render json: { error: "invalid role" }, status: :unprocessable_entity if role.nil?

    @membership.update!(role: role)
    render json: @membership.as_json(include: { user: { only: %i[id email] } })
  end

  def destroy
    org = @membership.organization
    ensure_org_member!(org)

    if @membership.user_id == current_user.id
      if @membership.owner? && org.owner_id == current_user.id
        render json: { error: "transfer ownership before leaving" }, status: :unprocessable_entity
        return
      end
    else
      ensure_admin_or_owner!(org)
    end

    @membership.destroy!
    head :no_content
  end

  private

  def set_membership
    @membership = Membership.find(params[:id])
    unless current_user.organizations.exists?(@membership.organization_id)
      raise ActiveRecord::RecordNotFound
    end
  end

  def membership_params
    params.require(:membership).permit(:organization_slug)
  end

  def resolve_membership_role
    role = params.dig(:membership, :role).to_s.presence
    return :member if role.blank?
    return role.to_sym if Membership.roles.key?(role)

    nil
  end

  def organization_from_header
    slug = request.headers["X-Organization-Slug"]
    return if slug.blank?

    current_user.organizations.find_by!(slug: slug)
  end

  def ensure_org_member!(org)
    current_user.organizations.find(org.id)
  end

  def ensure_admin_or_owner!(org)
    m = current_user.memberships.find_by!(organization: org)
    raise ActiveRecord::RecordNotFound unless m.admin? || m.owner?
  end
end
