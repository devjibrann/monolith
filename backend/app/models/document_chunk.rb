class DocumentChunk < ApplicationRecord
  acts_as_tenant :organization

  belongs_to :organization
  belongs_to :document

  has_neighbors :embedding

  validates :content, presence: true
  validates :position, presence: true
end
