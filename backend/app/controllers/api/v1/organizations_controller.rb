class Api::V1::OrganizationsController < Api::V1::BaseController
  def index
    render json: serialize_organizations(current_user.organizations.includes(:parent))
  end

  def hierarchy
    render json: OrgHierarchyBuilder.new(current_user).build
  end

  def create
    parent = find_parent_organization if organization_params[:parent_id].present?

    organization = Organization.create!(
      organization_params.except(:parent_id).merge(owner: current_user, parent: parent)
    )

    Membership.create!(
      user: current_user,
      organization: organization,
      role: :owner
    )

    render json: serialize_organization(organization), status: :created
  end

  private

  def organization_params
    params.require(:organization).permit(:name, :slug, :parent_id)
  end

  def find_parent_organization
    parent = Organization.find(organization_params[:parent_id])
    unless current_user.organizations.exists?(parent.id)
      raise ActiveRecord::RecordNotFound, "parent organization not accessible"
    end

    membership = current_user.memberships.find_by!(organization: parent)
    unless membership.admin? || membership.owner?
      raise ActiveRecord::RecordNotFound, "parent organization not accessible"
    end

    parent
  end

  def serialize_organizations(organizations)
    organizations.map { |org| serialize_organization(org) }
  end

  def serialize_organization(organization)
    membership = current_user.memberships.find_by(organization: organization)
    organization.as_json(only: %i[id name slug parent_id owner_id]).merge(
      "role" => membership&.role
    )
  end
end
