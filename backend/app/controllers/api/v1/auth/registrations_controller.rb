class Api::V1::Auth::RegistrationsController < Devise::RegistrationsController
  wrap_parameters false

  respond_to :json

  protected

  def sign_up(resource_name, resource)
    sign_in(resource_name, resource, store: false)
  end

  private

  def sign_up_params
    user_params = params[:user] || params.dig(:registration, :user)

    user_params.permit(
      :email,
      :password,
      :password_confirmation
    )
  end

  def respond_with(resource, _opts = {})
    if resource.persisted?
      token = request.env["warden-jwt_auth.token"] ||
              Warden::JWTAuth::UserEncoder.new.call(resource, :user, nil).first

      render json: {
        message: "Signed up successfully",
        token: token,
        user: user_payload(resource)
      }, status: :ok
    else
      render json: {
        errors: resource.errors.full_messages
      }, status: :unprocessable_entity
    end
  end



  def user_payload(user)
    {
      id: user.id,
      email: user.email
    }
  end
end
