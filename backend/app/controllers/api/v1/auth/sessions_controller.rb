class Api::V1::Auth::SessionsController < Devise::SessionsController
  wrap_parameters false

  respond_to :json

  def create
    creds = params.require(:user).permit(:email, :password)

    self.resource = resource_class.find_for_database_authentication(email: creds[:email])

    if resource&.valid_password?(creds[:password])
      sign_in(resource_name, resource, store: false)
      respond_with(resource, {})
    else
      render json: { error: "Invalid Email or password." }, status: :unauthorized
    end
  end

  private

  def respond_with(current_user, _opts = {})
    token = request.env["warden-jwt_auth.token"] ||
            Warden::JWTAuth::UserEncoder.new.call(current_user, :user, nil).first

    render json: {
      message: "Logged in successfully",
      token: token,
      user: { id: current_user.id, email: current_user.email }
    }, status: :ok
  end

  def respond_to_on_destroy
    head :no_content
  end
end
