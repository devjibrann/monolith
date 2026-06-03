class Api::V1::OrganizationsController < Api::V1::BaseController
  def index
    render json: current_user.organizations
  end

  def create
    organization = Organization.create!(organization_params.merge(owner: current_user))

    Membership.create!(
      user: current_user,
      organization: organization,
      role: :owner
    )

    render json: organization, status: :created
  end

  private

  def organization_params
    params.require(:organization).permit(:name, :slug)
  end
end
