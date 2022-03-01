const Conversation = require("./conversation");
const User = require("./user");
const Message = require("./message");
const ConversationUsers = require("./conversation_users");


// associations

User.hasMany(ConversationUsers);
ConversationUsers.belongsTo(User);
Conversation.hasMany(ConversationUsers);
ConversationUsers.belongsTo(Conversation);
Conversation.hasMany(Message);
Message.belongsTo(Conversation);

module.exports = {
  User,
  Conversation,
  Message,
  ConversationUsers
};
