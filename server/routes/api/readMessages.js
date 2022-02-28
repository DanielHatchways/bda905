const router = require("express").Router();
const ReadMessages = require("../../db/models/readmessages");

router.post("/", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const { lastReadIndex, conversationId, otherUser } = req.body;
    
    if (conversationId) {
      await ReadMessages.update({
        messageSentFrom: otherUser,
        lastReadIndex
      }, {
        where: {
          conversationId,
          messageSentFrom: otherUser
        }
      });
      const data = await ReadMessages.findAll({
        where: {
          conversationId,
          messageSentFrom: otherUser
        }, 
        attributes: ["lastReadIndex"],
      });

      return res.json({data});
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
