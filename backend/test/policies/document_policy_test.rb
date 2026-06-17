require "test_helper"

class DocumentPolicyTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(email: "owner@example.com", password: "password123")
    @member = User.create!(email: "member@example.com", password: "password123")
    @org = Organization.create!(name: "Acme", slug: "acme", owner: @owner)
    Membership.create!(user: @owner, organization: @org, role: :owner)
    Membership.create!(user: @member, organization: @org, role: :member)

    ActsAsTenant.with_tenant(@org) do
      @owner_doc = Document.create!(title: "Owner doc", user: @owner, organization: @org, status: :ready)
      @owner_doc.file.attach(io: StringIO.new("a"), filename: "a.txt", content_type: "text/plain")
      @member_doc = Document.create!(title: "Member doc", user: @member, organization: @org, status: :ready)
      @member_doc.file.attach(io: StringIO.new("b"), filename: "b.txt", content_type: "text/plain")
    end
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
