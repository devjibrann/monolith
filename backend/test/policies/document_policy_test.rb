require "test_helper"

class DocumentPolicyTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(email: "owner@example.com", password: "password123")
    @member = User.create!(email: "member@example.com", password: "password123")
    @org = Organization.create!(name: "Acme", slug: "acme", owner: @owner)
    Membership.create!(user: @owner, organization: @org, role: :owner)
    Membership.create!(user: @member, organization: @org, role: :member)

    ActsAsTenant.with_tenant(@org) do
      @owner_doc = build_document(title: "Owner doc", user: @owner, organization: @org)
      @member_doc = build_document(title: "Member doc", user: @member, organization: @org)
    end
  end

  def build_document(title:, user:, organization:)
    document = Document.new(title: title, user: user, organization: organization, status: :ready)
    document.file.attach(
      io: StringIO.new("sample"),
      filename: "#{title.parameterize}.txt",
      content_type: "text/plain"
    )
    document.save!
    document
  end

  test "members only see their own documents" do
    ActsAsTenant.current_tenant = @org
    scope = DocumentPolicy::Scope.new(@member, Document.all).resolve
    assert_equal [ @member_doc.id ], scope.pluck(:id)
  end

  test "owners see all organization documents" do
    ActsAsTenant.current_tenant = @org
    scope = DocumentPolicy::Scope.new(@owner, Document.all).resolve
    assert_equal [ @owner_doc.id, @member_doc.id ].sort, scope.pluck(:id).sort
  end
end
