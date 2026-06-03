class AddUniqueIndexToMemberships < ActiveRecord::Migration[8.1]
  def change
    add_index :memberships, %i[user_id organization_id], unique: true
  end
end
