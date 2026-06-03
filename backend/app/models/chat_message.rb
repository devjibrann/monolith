class ChatMessage < ApplicationRecord
  acts_as_tenant :organization

  belongs_to :organization
  belongs_to :user

  validates :role, inclusion: { in: %w[user assistant] }
  validates :content, presence: true
end
