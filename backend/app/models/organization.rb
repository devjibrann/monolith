class Organization < ApplicationRecord
  belongs_to :owner, class_name: "User"
  belongs_to :parent, class_name: "Organization", optional: true
  has_many :children, class_name: "Organization", foreign_key: :parent_id, dependent: :nullify
  has_many :memberships, dependent: :destroy
  has_many :users, through: :memberships
  has_many :documents, dependent: :destroy
  has_many :document_chunks, dependent: :destroy
  has_many :chat_messages, dependent: :destroy

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validate :parent_cannot_be_self
  validate :parent_cannot_create_cycle

  private

  def parent_cannot_be_self
    return if parent_id.blank?

    errors.add(:parent, "cannot be the same organization") if parent_id == id
  end

  def parent_cannot_create_cycle
    return if parent_id.blank?

    ancestor = parent
    while ancestor
      if ancestor.id == id
        errors.add(:parent, "would create a cycle")
        break
      end
      ancestor = ancestor.parent
    end
  end
end