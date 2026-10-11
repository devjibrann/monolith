# Builds a role-based user hierarchy for one organization:
# organization -> owners -> admins -> members.
#
# Admins and members are distributed round-robin across the level above so the
# graph renders as a balanced tree.
class UserHierarchyBuilder
  def initialize(organization, viewer)
    @organization = organization
    @viewer = viewer
  end

  def build
    memberships = @organization.memberships.includes(:user).order(:created_at)
    owners = memberships.select(&:owner?)
    admins = memberships.select(&:admin?)
    members = memberships.select(&:member?)

    nodes = [ org_node ]
    edges = []

    owners.each do |membership|
      nodes << user_node(membership)
      edges << edge(org_node_id, node_id(membership), "owner")
    end

    admins.each_with_index do |membership, index|
      nodes << user_node(membership)
      parent = owners.any? ? node_id(owners[index % owners.size]) : org_node_id
      edges << edge(parent, node_id(membership), "admin")
    end

    member_parents = admins.presence || owners
    members.each_with_index do |membership, index|
      nodes << user_node(membership)
      parent = member_parents.any? ? node_id(member_parents[index % member_parents.size]) : org_node_id
      edges << edge(parent, node_id(membership), "member")
    end

    {
      organization: { id: @organization.id, name: @organization.name, slug: @organization.slug },
      nodes: nodes,
      edges: edges
    }
  end

  private

  def org_node
    {
      id: org_node_id,
      type: "organization",
      data: {
        "label" => @organization.name,
        "slug" => @organization.slug,
        "member_count" => @organization.memberships.count
      }
    }
  end

  def user_node(membership)
    user = membership.user
    {
      id: node_id(membership),
      type: "person",
      data: {
        "label" => display_name(user.email),
        "email" => user.email,
        "role" => membership.role,
        "is_viewer" => user.id == @viewer.id,
        "documents_count" => document_counts.fetch(user.id, 0),
        "questions_asked" => chat_counts.fetch(user.id, 0),
        "joined_at" => membership.created_at.iso8601
      }
    }
  end

  def document_counts
    @document_counts ||= Document.where(organization: @organization).group(:user_id).count
  end

  def chat_counts
    @chat_counts ||= ChatMessage.where(organization: @organization, role: "user").group(:user_id).count
  end

  def org_node_id
    "org-#{@organization.id}"
  end

  def node_id(membership)
    "person-#{membership.user_id}"
  end

  def edge(source, target, edge_type)
    { id: "#{source}->#{target}", source: source, target: target, edge_type: edge_type }
  end

  def display_name(email)
    email.to_s.split("@").first.presence || email
  end
end
