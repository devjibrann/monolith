class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def organization
    ActsAsTenant.current_tenant
  end

  def membership
    return @membership if defined?(@membership)

    @membership = organization ? user.memberships.find_by(organization: organization) : nil
  end

  def admin_or_owner?
    membership&.admin? || membership&.owner?
  end

  class Scope
    attr_reader :user, :scope

    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def organization
      ActsAsTenant.current_tenant
    end

    def resolve
      raise NotImplementedError
    end
  end
end
