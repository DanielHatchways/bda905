import React from 'react';
import { Box, Badge } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { BadgeAvatar, ChatContent } from '../Sidebar';

const useStyles = makeStyles((theme) => ({
  root: {
    borderRadius: 8,
    height: 80,
    boxShadow: '0 2px 10px 0 rgba(88,133,196,0.05)',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    '&:hover': {
      cursor: 'grab',
    },
  },
  bubble: {
    margin: 20,
  }
}));

const Chat = ({ conversation, setActiveChat, unread }) => {
  const classes = useStyles();
  const { otherUser } = conversation;

  const handleClick = async (conversation) => {
    await setActiveChat(conversation);
  };

  return (
    <Box onClick={() => handleClick(conversation)} className={classes.root}>
      <BadgeAvatar
        photoUrl={otherUser.photoUrl}
        username={otherUser.username}
        online={otherUser.online}
        sidebar={true}
      />
      <ChatContent 
        conversation={conversation}
        unread={unread} 
      />
      <Badge 
        className={classes.bubble} 
        badgeContent={unread} 
        color="primary"
      />
    </Box>
  );
};

export default Chat;
