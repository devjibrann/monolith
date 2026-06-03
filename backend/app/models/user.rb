class User < ApplicationRecord
  devise :database_authenticatable,
         :registerable,
         :jwt_authenticatable,
         jwt_revocation_strategy: JwtDenylist

  has_many :memberships, dependent: :destroy
  has_many :organizations, through: :memberships
  has_many :documents, dependent: :destroy
  has_many :chat_messages, dependent: :destroy

  validates :email, presence: true, uniqueness: true
end