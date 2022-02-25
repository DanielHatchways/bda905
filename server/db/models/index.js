const Conversation = require("./conversation");
const User = require("./user");
const Message = require("./message");
const ReadMessages = require("./readMessages");

// associations

User.hasMany(Conversation);
Conversation.belongsTo(User, { as: "user1" });
Conversation.belongsTo(User, { as: "user2" });
Message.belongsTo(Conversation);
Conversation.hasMany(Message);
ReadMessages.belongsTo(Conversation);
Conversation.hasMany(ReadMessages);

module.exports = {
  User,
  Conversation,
  Message
};
