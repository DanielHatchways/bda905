const Sequelize = require("sequelize");
const db = require("../db");

const ReadMessages = db.define("readmessages", {
  messageSentFrom: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  lastReadIndex: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

module.exports = ReadMessages;
