const Sequelize = require("sequelize");
const db = require("../db");

const ReadMessages = db.define("readmessages", {
  lastReadIndex: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

module.exports = ReadMessages;
