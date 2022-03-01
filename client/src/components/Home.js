import React, { useCallback, useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { Grid, CssBaseline, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { SidebarContainer } from '../components/Sidebar';
import { ActiveChat } from '../components/ActiveChat';
import { SocketContext } from '../context/socket';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
  },
}));

const Home = ({ user, logout }) => {
  const history = useHistory();

  const socket = useContext(SocketContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const addSearchedUsers = (users) => {
    const currentUsers = {};

    // make table of current users so we can lookup faster
    conversations.forEach((convo) => {
      currentUsers[convo.otherUser.id] = true;
    });

    const newState = [...conversations];
    users.forEach((user) => {
      // only create a fake convo if we don't already have a convo with this user
      if (!currentUsers[user.id]) {
        let fakeConvo = { otherUser: user, messages: [] };
        newState.push(fakeConvo);
      }
    });

    setConversations(newState);
  };

  const clearSearchedUsers = () => {
    setConversations((prev) => prev.filter((convo) => convo.id));
  };

  const saveMessage = async (body) => {
    const { data } = await axios.post('/api/messages', body);
    return data;
  };

  const sendMessage = (data, body) => {
    socket.emit('new-message', {
      message: data.message,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };

  const postMessage = async (body) => {
    try {
      const data = await saveMessage(body);

      if (!body.conversationId) {
        addNewConvo(body.recipientId, data.message);
      } else {
        addMessageToConversation(data);
      }

      sendMessage(data, body);
    } catch (error) {
      console.error(error);
    }
  };

  const addNewConvo = useCallback(
    (recipientId, message) => {

      let convoCopy = conversations.map(conversation => (
        { ...conversation, 
          messages: conversation.messages.map(message => ({...message}))
        }
      ));

      convoCopy.forEach((convo) => {
        if (convo.otherUser.id === recipientId) {
          convo.messages.push(message);
          convo.latestMessageText = message.text;
          convo.id = message.conversationId;
        }
      });
      setConversations(convoCopy);
    },
    [setConversations, conversations]
  );
  
  //calculates number of unread messages from other user
  const calculateUnreadMessages = useCallback(() => {
    
    const countUnread = (messages, lastReadIndex, userId) => {
      let count = 0
      for (let i = lastReadIndex + 1; i < messages.length; i++) {
        if (messages[i].senderId !== userId) count++;
      }
      return count;
    }

    setConversations((prev) =>
      prev.map((convo) => {
        const lastReadIndex = convo.readmessages[convo.otherUser.id].lastReadIndex;
        const convoCopy = { ...convo };
        convoCopy.unread = countUnread(convo.messages, lastReadIndex, user.id);
        return convoCopy;
      })
    );    
  }, [user.id])
  
  //api call to save read message info to database 
  const saveReadStatus = async (lastReadIndex, conversationId, otherUser) => {
    const body = {
      lastReadIndex,
      conversationId,
      otherUser,
    }
    const { data } = await axios.post('/api/readMessages', body);
    return data.data[0].lastReadIndex;
  };

  //emits read message info to socket
  const sendReadMessage = useCallback((lastReadIndex, otherUser, conversationId) => {
    socket.emit('read-message', {
      lastReadIndex,
      otherUser,
      conversationId
    });
  }, [socket]);

  //saves read messages info to state
  const updateReadMessage = useCallback((lastIndex, otherUser, conversationId) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.id === conversationId && convo.readmessages[otherUser] !== lastIndex) {
          const convoCopy = { ...convo, readmessages: {...convo.readmessages}};
            convoCopy.readmessages[otherUser].lastReadIndex = lastIndex;
            return convoCopy;
        } else {
          return convo;
        }
      })
    );
  }, [])

  //marks conversations and messages read and updates state and database
  const markRead = useCallback(async (conversation) => { 
      if (conversation.messages.length === 0) return;
      const messages = conversation.messages
      const lastMessageIndex = messages.length - 1;
      const lastMessageSender = messages[lastMessageIndex].senderId;
      const otherUser = conversation.otherUser.id;

      //there will only be unread messages to mark as read if last message was from other user
      if (lastMessageSender === otherUser) {
        const convoId = conversation.id;
        const lastIndex = await saveReadStatus(lastMessageIndex, convoId, otherUser);
        sendReadMessage(lastIndex, otherUser, conversation.id);

        updateReadMessage(lastIndex, otherUser, convoId);

        calculateUnreadMessages(); 
      } 
    }, [calculateUnreadMessages, sendReadMessage, updateReadMessage]);

  //select conversation obj using username from activeConversation state
    const findActiveConversation = useCallback((conversations, activeConversation) => {
    return conversations
      ? conversations.find(
          (conversation) => conversation.otherUser.username === activeConversation
        )
      : {};    
  }, [])

  //handles state of unread message tracking for rendering of components
  const handleUnread = useCallback((conversations) => {
    calculateUnreadMessages();
    if(activeConversation) {
      const conversation = findActiveConversation(conversations, activeConversation);
      markRead(conversation);
    };
  }, [calculateUnreadMessages, markRead, findActiveConversation, activeConversation])

  const addMessageToConversation = useCallback(
    (data) => {
      // if sender isn't null, that means the message needs to be put in a brand new convo
      const { message, sender = null } = data;
      if (sender !== null) {
        const newConvo = {
          id: message.conversationId,
          otherUser: sender,
          messages: [message],
        };
        newConvo.latestMessageText = message.text;
        setConversations((prev) => [newConvo, ...prev]);
      }

      let convoCopy = conversations.map(conversation => (
        { ...conversation, 
          messages: conversation.messages.map(message => ({...message}))
        }
      ));

      convoCopy.forEach((convo) => {
        if (convo.id === message.conversationId) {
          convo.messages.push(message);
          convo.latestMessageText = message.text;
        }
      });

      setConversations(convoCopy);
      if(data.message.senderId !== user.id) handleUnread(convoCopy);
    },
    [setConversations, handleUnread, conversations, user]
  );

  const setActiveChat = (conversation) => {
    setActiveConversation(conversation.otherUser.username);
    markRead(conversation);
  };

  const addOnlineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: true };
          return convoCopy;
        } else {
          return convo;
        }
      })
    );
  }, []);

  const removeOfflineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: false };
          return convoCopy;
        } else {
          return convo;
        }
      })
    );
  }, []);

  //handles incoming socket data destructuring
  const readMessageHandler = useCallback((data) => {
    const { lastReadIndex, otherUser, conversationId } = data;

    updateReadMessage(lastReadIndex, otherUser, conversationId);
  },[updateReadMessage])

  // Lifecycle

  useEffect(() => {
    // Socket init
    socket.on('read-message', readMessageHandler);
    socket.on('add-online-user', addOnlineUser);
    socket.on('remove-offline-user', removeOfflineUser);
    socket.on('new-message', addMessageToConversation);

    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off('read-message', readMessageHandler);
      socket.off('add-online-user', addOnlineUser);
      socket.off('remove-offline-user', removeOfflineUser);
      socket.off('new-message', addMessageToConversation);
    };
  }, [addMessageToConversation, addOnlineUser, removeOfflineUser, readMessageHandler, socket]);

  useEffect(() => {
    // when fetching, prevent redirect
    if (user?.isFetching) return;

    if (user && user.id) {
      setIsLoggedIn(true);
    } else {
      // If we were previously logged in, redirect to login instead of register
      if (isLoggedIn) history.push('/login');
      else history.push('/register');
    }
  }, [user, history, isLoggedIn]);

  useEffect(() => {
    // reverses messages array order
    const reverseMessages = (data) => { 
      const dataCopy = data.map(conversation => (
        { ...conversation, 
          messages: conversation.messages.map(message => ({...message})),
          otherUser: {...conversation.otherUser}
        }
      ))

      return dataCopy.map((conversation) => {
        let newConversationObj = conversation;
        newConversationObj.messages = conversation.messages.slice(0).reverse();
        return newConversationObj;
      });
    }

    // changes data structure for easier access
    const formatReadMessages = (data) => {
      const dataCopy = data.map(conversation => (
        { ...conversation, 
          readmessages: conversation.readmessages.map(readmessage => ({...readmessage})),
        }
      ))
      
      const createReadMessagesObj = (readMessages) => {
        let readMessagesObj = {}
        readMessages.forEach((readmessage) => {
          readMessagesObj[readmessage.messageSentFrom] = readmessage;
        })
        return readMessagesObj;
      }

      return dataCopy.map((conversation) => {
        let newConversationObj = conversation;
        newConversationObj.readmessages = createReadMessagesObj(newConversationObj.readmessages);
        return newConversationObj;
      });
    }

    const formatData = (data) => {
      const formatedMessages = reverseMessages(data);
      const formatedReadMessages = formatReadMessages(formatedMessages);

      return formatedReadMessages;
    }

    const fetchConversations = async () => {
      try {
        const { data } = await axios.get('/api/conversations');
        const newData = formatData(data);
        setConversations(newData);
        calculateUnreadMessages();
      } catch (error) {
        console.error(error);
      }
    };
    if (!user.isFetching) {
      fetchConversations();
    }
  }, [calculateUnreadMessages, user]);

  const handleLogout = async () => {
    if (user && user.id) {
      await logout(user.id);
    }
  };

  return (
    <>
      <Button onClick={handleLogout}>Logout</Button>
      <Grid container component="main" className={classes.root}>
        <CssBaseline />
        <SidebarContainer
          conversations={conversations}
          user={user}
          clearSearchedUsers={clearSearchedUsers}
          addSearchedUsers={addSearchedUsers}
          setActiveChat={setActiveChat}
        />
        <ActiveChat
          activeConversation={activeConversation}
          conversations={conversations}
          user={user}
          postMessage={postMessage}
          findActiveConversation={findActiveConversation}
        />
      </Grid>
    </>
  );
};

export default Home;
