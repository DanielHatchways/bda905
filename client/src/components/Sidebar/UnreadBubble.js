import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Typography } from '@material-ui/core';

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    padding: 20,
  },
  text: {
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    padding: 2.5,
    fontWeight: 'bold',
  },
  bubble: {
    display: 'flex',
    justifyContent: 'center',
    background: '#3F92FF',
    borderRadius: '10px',
    'min-width': '20px',
  },
}));

const UnreadBubble = ({ text }) => {
  const classes = useStyles();

  return (
    <Box className={classes.root}>
      <Box className={classes.bubble}>
        <Typography className={classes.text}>{text}</Typography>
      </Box>
    </Box>
  );
};

export default UnreadBubble;
