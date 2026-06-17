require "test_helper"

class OrgHierarchyBuilderTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(email: "owner@example.com", password: "password123")
    @member = User.create!(email: "member@example.com", password: "password123")

    @parent = Organization.create!(name: "Parent Co", slug: "parent-co", owner: @owner)
    Membership.create!(user: @owner, organization: @parent, role: :owner)

    @child = Organization.create!(name: "Child Team", slug: "child-team", owner: @owner, parent: @parent)
    Membership.create!(user: @owner, organization: @child, role: :owner)
    Membership.create!(user: @member, organization: @parent, role: :member)
  end

  test "builds nodes for user organizations members and parent links" do
    graph = OrgHierarchyBuilder.new(@owner).build

    node_ids = graph[:nodes].map { |n| n[:id] }
    assert_includes node_ids, "user-#{@owner.id}"
    assert_includes node_ids, "organization-#{@parent.id}"
    assert_includes node_ids, "organization-#{@child.id}"
    assert_includes node_ids, "member-#{@parent.id}-#{@member.id}"

    edge_types = graph[:edges].map { |e| e[:edge_type] }
    assert_includes edge_types, "parent"
    assert_includes edge_types, "membership"
    assert_includes edge_types, "member"
  end

  test "members only see their own documents in the graph" do
    ActsAsTenant.with_tenant(@parent) do
      build_document(title: "Owner doc", user: @owner, organization: @parent)
      build_document(title: "Member doc", user: @member, organization: @parent)
    end

    owner_graph = OrgHierarchyBuilder.new(@owner).build
    owner_doc_nodes = owner_graph[:nodes].select { |n| n[:type] == "document" }
    assert_equal 2, owner_doc_nodes.size

    member_graph = OrgHierarchyBuilder.new(@member).build
    member_doc_nodes = member_graph[:nodes].select { |n| n[:type] == "document" }
    assert_equal 1, member_doc_nodes.size
    assert_equal "Member doc", member_doc_nodes.first.dig(:data, "label")
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
end
