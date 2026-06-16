class DocumentPolicy < ApplicationPolicy
  def index?
    organization.present?
  end

  def show?
    in_scope?
  end

  def create?
    organization.present?
  end

  def destroy?
    in_scope? && (record.user_id == user.id || admin_or_owner?)
  end

  class Scope < Scope
    def resolve
      return scope.none unless organization

      scope.visible_to(user, organization)
    end
  end

  private

  def in_scope?
    Scope.new(user, Document.all).resolve.exists?(id: record.id)
  end
end
