class CreateDocuments < ActiveRecord::Migration[8.1]
  def change
    create_table :documents do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false
      t.integer :status, null: false, default: 0
      t.text :processing_error

      t.timestamps
    end

    add_index :documents, [ :organization_id, :created_at ]
  end
end
