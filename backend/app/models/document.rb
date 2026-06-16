class Document < ApplicationRecord
  acts_as_tenant :organization

  ALLOWED_CONTENT_TYPES = %w[
    text/plain
    text/markdown
    application/pdf
    application/json
  ].freeze

  belongs_to :organization
  belongs_to :user
  has_many :document_chunks, dependent: :destroy
  has_one_attached :file

  enum :status, { pending: 0, processing: 1, ready: 2, failed: 3 }

  scope :visible_to, lambda { |user, organization|
    membership = user.memberships.find_by(organization: organization)
    scoped = where(organization: organization)
    if membership&.admin? || membership&.owner?
      scoped
    else
      scoped.where(user_id: user.id)
    end
  }

  validates :title, presence: true
  validate :file_must_be_attached, on: :create
  validate :acceptable_file_type, on: :create

  after_create_commit :enqueue_processing

  def file_must_be_attached
    errors.add(:file, "must be attached") unless file.attached?
  end

  def acceptable_file_type
    return unless file.attached?

    blob = file.blob
    return if DocumentTextExtractor.supported?(blob)

    errors.add(:file, "must be a PDF, TXT, or Markdown file")
  end

  private

  def enqueue_processing
    ProcessDocumentJob.perform_later(id)
  end
end
