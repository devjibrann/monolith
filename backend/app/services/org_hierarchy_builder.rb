class OrgHierarchyBuilder
  def initialize(user)
    @user = user
  end

  def build
    nodes = []
    edges = []
    orgs = @user.organizations.includes(:parent, memberships: :user).distinct
    org_ids = orgs.map(&:id).to_set

    user_node_id = node_id("user", @user.id)
    nodes << node(
      user_node_id,
      "user",
      label: display_name(@user.email),
      email: @user.email,
      subtitle: "You"
    )

    orgs.each do |org|
      org_node_id = node_id("organization", org.id)
      viewer_membership = @user.memberships.find_by(organization: org)

      nodes << node(
        org_node_id,
        "organization",
        label: org.name,
        slug: org.slug,
        role: viewer_membership&.role,
        parent_id: org.parent_id
      )

      edges << edge("membership-#{@user.id}-#{org.id}", user_node_id, org_node_id, "membership")

      if org.parent_id.present? && org_ids.include?(org.parent_id)
        edges << edge(
          "parent-#{org.parent_id}-#{org.id}",
          node_id("organization", org.parent_id),
          org_node_id,
          "parent"
        )
      end

      org.memberships.each do |membership|
        member_user = membership.user
        member_node_id = node_id("member", "#{org.id}-#{member_user.id}")

        nodes << node(
          member_node_id,
          "member",
          label: display_name(member_user.email),
          email: member_user.email,
          role: membership.role,
          organization_id: org.id
        )

        edges << edge("member-#{org.id}-#{member_user.id}", org_node_id, member_node_id, "member")

        visible_documents(org, membership, viewer_membership).each do |document|
          doc_node_id = node_id("document", document.id)

          nodes << node(
            doc_node_id,
            "document",
            label: document.title,
            status: document.status,
            filename: document.file.attached? ? document.file.filename.to_s : nil,
            organization_id: org.id
          )

          edges << edge("owns-#{document.id}", member_node_id, doc_node_id, "owns")
        end
      end
    end

    { nodes: nodes, edges: edges }
  end

  private

  def visible_documents(org, membership, viewer_membership)
    unless viewer_membership&.admin? || viewer_membership&.owner? || membership.user_id == @user.id
      return []
    end

    ActsAsTenant.without_tenant do
      Document.includes(file_attachment: :blob).where(organization_id: org.id, user_id: membership.user_id)
    end
  end

  def node(id, type, **data)
    { id: id, type: type, data: data.transform_keys(&:to_s) }
  end

  def edge(id, source, target, edge_type)
    { id: id, source: source, target: target, edge_type: edge_type }
  end

  def node_id(kind, key)
    "#{kind}-#{key}"
  end

  def display_name(email)
    email.to_s.split("@").first.presence || email
  end
end
