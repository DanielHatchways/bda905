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

      setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === recipientId) {
          let convoCopy = {...convo, messages: convo.messages.map(message => ({...message}))}
          convoCopy.messages.push(message);
          convoCopy.latestMessageText = message.text;
          convoCopy.id = message.conversationId;
          return convoCopy
        } else {
          return convo;
        }
      })
      );
    },
    [setConversations]
  );

  //emits read message info to socket
  const sendReadMessage = useCallback((lastReadIndex, conversationId) => {
    socket.emit('read-message', {
      lastReadIndex,
      conversationId,
    });
  }, [socket]);

  //updates read status of messages in database
  const saveReadMessages = useCallback((readMessages, convoId, lastMessageIndex) => {
    const body = {readMessages, convoId}
    axios.put('/api/messages', body)
    .then((res) => {
      if (res.status === 204) {
        sendReadMessage(lastMessageIndex, convoId);
        setConversations((prev) =>
            prev.map((convo) => {
              if (convo.id === convoId) {
                const convoCopy = { ...convo };
                convoCopy.unread = 0;
                return convoCopy;
              } else {
                return convo;
              }
            })
          )
      }
    })
  }, [sendReadMessage])

  //marks conversations and messages read and updates state and database
  const markRead = useCallback((conversation) => { 
      if (conversation.messages.length === 0) return;
      const messages = conversation.messages
      const lastMessageIndex = messages.length - 1;
      const lastMessageSender = messages[lastMessageIndex].senderId;
      const otherUser = conversation.otherUser.id;

      //there will only be unread messages to mark as read if last message was from other user
      if (lastMessageSender === otherUser) {
        const convoId = conversation.id;
        const readMessages = []

        messages.forEach((message) => {
          if (message.read === false && message.senderId !== user.id) readMessages.push(message.id);
        })

        saveReadMessages(readMessages, convoId, lastMessageIndex)
      } 
    }, [saveReadMessages, user.id]);

  //select conversation obj using username from activeConversation state
    const findActiveConversation = useCallback((conversations, activeConversation) => {
    return conversations
      ? conversations.find(
          (conversation) => conversation.otherUser.username === activeConversation
        )
      : {};    
  }, [])

  //handles state of unread messages in active conversations
  const handleActiveConvoUnread = useCallback((conversations) => {
    if(activeConversation) {
      const conversation = findActiveConversation(conversations, activeConversation);
      markRead(conversation);
    };
  }, [markRead, findActiveConversation, activeConversation])

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

      const convoCopy = conversations.map((convo) => {
        if (convo.id === message.conversationId) {
          let convoCopy = {...convo, messages: convo.messages.map(message => ({...message}))}
          convoCopy.messages.push(message);
          convoCopy.latestMessageText = message.text;
          if (message.senderId !== user.id) convoCopy.unread++
          return convoCopy;
        } else {
          return convo;
        }
      });

      setConversations(convoCopy);
      if(data.message.senderId !== user.id) handleActiveConvoUnread(convoCopy);
    },
    [setConversations, handleActiveConvoUnread, conversations, user]
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
    const { lastReadIndex, conversationId } = data;
    
    setConversations((prev) =>
    prev.map((convo) => {
      if (convo.id === conversationId) {
        const convoCopy = { ...convo };
        convoCopy.otherUserLastRead = lastReadIndex;
        return convoCopy;
      } else {
        return convo;
      }
    })
  );
  },[])

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
    const reverseMessages = (conversations) => { 
      return conversations.map((conversation) => {
        let newConversationObj = conversation;
        newConversationObj.messages = conversation.messages.slice(0).reverse();
        return newConversationObj;
      });
    }

      //calculates number of unread messages from other user
    const calculateUnreadMessages = (conversations) => {
    
      const countUnread = (messages, userId) => {
        let count = 0
        messages.forEach((message)=> {
          if (message.senderId !== userId && !message.read) count++;
        })
        return count;
      }

      const otherUserLastRead = (messages, userId) => {
        let index = -1;
        messages.forEach((message, i)=> {
          if (message.senderId === userId && message.read) index = i;
        })
        return index;
      }

      return conversations.map((convo) => {
          convo.unread = countUnread(convo.messages, user.id);
          convo.otherUserLastRead = otherUserLastRead(convo.messages, user.id);
          return convo;
        })    
    }

    const formatData = (data) => {
      const dataCopy = data.map(conversation => (
        { ...conversation, 
          messages: conversation.messages.map(message => ({...message})),
          otherUser: {...conversation.otherUser}
        }
      ))
      const formatedMessages = reverseMessages(dataCopy);
      const countUnread = calculateUnreadMessages(formatedMessages)
      return countUnread;
    }

    const fetchConversations = async () => {
      try {
        const { data } = await axios.get('/api/conversations');
        const newData = formatData(data);
        setConversations(newData);
      } catch (error) {
        console.error(error);
      }
    };
    if (!user.isFetching) {
      fetchConversations();
    }
  }, [user]);

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
