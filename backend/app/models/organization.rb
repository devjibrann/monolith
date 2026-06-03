class Organization < ApplicationRecord
  belongs_to :owner, class_name: "User"
  has_many :memberships, dependent: :destroy
  has_many :users, through: :memberships
  has_many :documents, dependent: :destroy
  has_many :document_chunks, dependent: :destroy
  has_many :chat_messages, dependent: :destroy

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
end
  