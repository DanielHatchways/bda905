import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Avatar } from '@material-ui/core';
import { SenderBubble, OtherUserBubble } from '.';
import moment from 'moment';

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  avatar: {
    height: 20,
    width: 20,
  },
}));

const Messages = (props) => {
  const classes = useStyles();
  const { messages, otherUser, userId, lastRead } = props;


  return (
    <Box>
      {messages.map((message, i) => {
        const time = moment(message.createdAt).format('h:mm');

        return message.senderId === userId ? (
          <Box className={classes.root} key={message.id}>
            <SenderBubble  text={message.text} time={time} />
            {lastRead === i && 
              <Avatar
                alt={otherUser.username}
                src={otherUser.photoUrl}
                className={classes.avatar}
              />
            }
          </Box>
        ) : (
          <OtherUserBubble
            key={message.id}
            text={message.text}
            time={time}
            otherUser={otherUser}
          />
        );
      })}
    </Box>
  );
};

export default Messages;
