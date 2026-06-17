class CreateChatMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :chat_messages do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :role, null: false
      t.text :content, null: false

      t.timestamps
    end

    add_index :chat_messages, [ :organization_id, :created_at ]
  end
end
