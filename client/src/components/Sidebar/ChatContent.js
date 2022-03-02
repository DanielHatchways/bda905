import React from "react";
import { Box, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    justifyContent: "space-between",
    marginLeft: 20,
    flexGrow: 1,
  },
  username: {
    fontWeight: "bold",
    letterSpacing: -0.2,
  },
  previewText: {
    fontSize: 12,
    letterSpacing: -0.17,
  },
  read: {
    color: "#9CADC8",
  },
  unread: {
    fontWeight: "bold",
  },
}));

const ChatContent = ({ 
  conversation,
  unread,
}) => {
  const classes = useStyles();

  const { otherUser } = conversation;
  const latestMessageText = conversation.id && conversation.latestMessageText;

  return (
    <Box className={classes.root}>
      <Box>
        <Typography className={classes.username}>
          {otherUser.username}
        </Typography>
        <Box className={classes.previewText}>
          {unread > 0 ? 
            <Typography className={classes.unread}>
              {latestMessageText}
            </Typography> :
            <Typography className={classes.read}>
              {latestMessageText}
            </Typography>
          }
        </Box>
      </Box>
    </Box>
  );
};

export default ChatContent;
