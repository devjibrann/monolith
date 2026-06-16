class AddSourcesToChatMessages < ActiveRecord::Migration[8.1]
  def change
    add_column :chat_messages, :sources, :jsonb, null: false, default: []
  end
end
