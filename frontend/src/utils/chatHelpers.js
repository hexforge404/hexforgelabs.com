// chatHelpers.js

export const addUserMessage = (text) => {
  const now = new Date().toLocaleTimeString();
  const isCommand = text.startsWith('!');
  return {
    from: 'user',
    text,
    time: now,
    tag: isCommand ? text.split(' ')[0] : ''
  };
};

export const addAssistantMessage = () => ({
  from: 'assistant',
  text: '',
  time: new Date().toLocaleTimeString()
});

export const updateLastAssistantMessage = (messages, newText) => {
  const updated = [...messages];
  updated[updated.length - 1] = {
    ...updated[updated.length - 1],
    text: newText
  };
  return updated;
};
