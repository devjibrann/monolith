class AddParentIdToOrganizations < ActiveRecord::Migration[8.1]
  def change
    add_reference :organizations, :parent, foreign_key: { to_table: :organizations }, index: true
  end
end
