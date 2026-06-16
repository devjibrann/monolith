class Api::V1::DocumentsController < Api::V1::BaseController
  before_action :ensure_tenant!
  before_action :set_document, only: [:show, :destroy]

  def index
    authorize Document
    documents = policy_scope(Document).includes(file_attachment: :blob).order(created_at: :desc)
    render json: documents.map { |doc| serialize(doc) }
  end

  def show
    authorize @document
    render json: serialize(@document)
  end

  def create
    authorize Document
    document = Document.new(
      title: document_params[:title],
      user: current_user,
      organization: ActsAsTenant.current_tenant
    )
    document.file.attach(params[:file])

    if document.save
      render json: serialize(document), status: :created
    else
      render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    authorize @document
    @document.destroy!
    head :no_content
  end

  private

  def set_document
    @document = policy_scope(Document).find(params[:id])
  end

  def document_params
    params.permit(:title, :file)
  end

  def serialize(document)
    {
      id: document.id,
      title: document.title,
      status: document.status,
      processing_error: document.processing_error,
      filename: document.file.attached? ? document.file.filename.to_s : nil,
      byte_size: document.file.attached? ? document.file.byte_size : nil,
      created_at: document.created_at,
      owned_by_current_user: document.user_id == current_user.id
    }
  end
end
