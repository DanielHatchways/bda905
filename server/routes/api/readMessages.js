const router = require("express").Router();
const ReadMessages = require("../../db/models/readmessages");


// expects {recipientId, text, conversationId } in body (conversationId will be null if no conversation exists yet)
router.post("/", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const { lastReadIndex, conversationId } = req.body;
    

    // if we already know conversation id, we can save time and just add it to message and return
    if (conversationId) {
      const data = await ReadMessages.update({
        lastReadIndex
      }, {
        where: {
          conversationId
        }
      });
      return res.json({ data });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
