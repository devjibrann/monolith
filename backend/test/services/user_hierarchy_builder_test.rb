require "test_helper"

class UserHierarchyBuilderTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(email: "owner@example.com", password: "password123")
    @admin = User.create!(email: "admin@example.com", password: "password123")
    @member = User.create!(email: "member@example.com", password: "password123")

    @organization = Organization.create!(name: "Acme", slug: "acme", owner: @owner)
    Membership.create!(user: @owner, organization: @organization, role: :owner)
    Membership.create!(user: @admin, organization: @organization, role: :admin)
    Membership.create!(user: @member, organization: @organization, role: :member)
  end

  test "builds role hierarchy with org root and role edges" do
    graph = UserHierarchyBuilder.new(@organization, @owner).build

    node_ids = graph[:nodes].map { |n| n[:id] }
    assert_includes node_ids, "org-#{@organization.id}"
    assert_includes node_ids, "person-#{@owner.id}"
    assert_includes node_ids, "person-#{@admin.id}"
    assert_includes node_ids, "person-#{@member.id}"

    edge_types = graph[:edges].map { |e| e[:edge_type] }
    assert_includes edge_types, "owner"
    assert_includes edge_types, "admin"
    assert_includes edge_types, "member"
  end

  test "marks the viewer and includes activity counts" do
    ActsAsTenant.with_tenant(@organization) do
      build_document(title: "Owner doc", user: @owner, organization: @organization)
      ChatMessage.create!(
        user: @member,
        organization: @organization,
        role: "user",
        content: "What is in the docs?"
      )
    end

    graph = UserHierarchyBuilder.new(@organization, @member).build
    member_node = graph[:nodes].find { |n| n[:id] == "person-#{@member.id}" }

    assert member_node.dig(:data, "is_viewer")
    assert_equal 0, member_node.dig(:data, "documents_count")
    assert_equal 1, member_node.dig(:data, "questions_asked")

    owner_node = graph[:nodes].find { |n| n[:id] == "person-#{@owner.id}" }
    assert_not owner_node.dig(:data, "is_viewer")
    assert_equal 1, owner_node.dig(:data, "documents_count")
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
