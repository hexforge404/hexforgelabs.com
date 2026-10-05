import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FloatingChatButton from '../FloatingChatButton';

jest.mock('../ChatAssistant', () => {
  return function MockChatAssistant({ onClose }) {
    return (
      <div data-testid="chat-assistant">
        HexForge Assistant
        <button onClick={onClose}>Close assistant</button>
      </div>
    );
  };
});

test('renders an accessible deterministic assistant button', () => {
  render(<FloatingChatButton />);

  const button = screen.getByRole('button', {
    name: 'Open HexForge Assistant',
  });

  expect(button).toBeInTheDocument();
  expect(button.querySelector('svg')).toBeInTheDocument();
  expect(button).not.toHaveTextContent('💬');
});

test('opens and closes the assistant drawer', () => {
  render(<FloatingChatButton />);

  expect(screen.queryByTestId('chat-assistant')).not.toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', { name: 'Open HexForge Assistant' })
  );

  expect(screen.getByTestId('chat-assistant')).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', { name: 'Close assistant' })
  );

  expect(screen.queryByTestId('chat-assistant')).not.toBeInTheDocument();
});
