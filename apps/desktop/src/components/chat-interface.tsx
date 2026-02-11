import { useState, useRef, useEffect } from 'react';
import { sendChatMessage, clearConversation, ChatMessage, ChatResponse } from '../lib/api-client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';

interface ChatInterfaceProps {
  sessionId?: string;
  onClear?: () => void;
}

export function ChatInterface({ sessionId = 'default', onClear }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentResponse('');

    let fullResponse = '';

    try {
      await sendChatMessage([userMessage], sessionId, (response: ChatResponse) => {
        if (response.type === 'text') {
          fullResponse += response.content;
          setCurrentResponse(fullResponse);
        } else if (response.type === 'toolCalls') {
          console.log('Tool calls:', response.content);
        } else if (response.type === 'toolResults') {
          console.log('Tool results:', response.content);
        } else if (response.type === 'error') {
          console.error('Error:', response.content);
        }
      });

      if (fullResponse) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: fullResponse },
        ]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
      setCurrentResponse('');
    }
  };

  const handleClear = async () => {
    try {
      await clearConversation(sessionId);
      setMessages([]);
      setCurrentResponse('');
      if (onClear) onClear();
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">AI Security Assistant</h2>
        <Button onClick={handleClear} variant="outline" size="sm">
          Clear Chat
        </Button>
      </div>

      <Card className="flex-1 overflow-y-auto mb-4 p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Ask me about vulnerability scanning, network analysis, or security testing</p>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {currentResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-muted">
              <p className="text-sm whitespace-pre-wrap">{currentResponse}</p>
            </div>
          </div>
        )}

        {isLoading && !currentResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-muted">
              <p className="text-sm">Thinking...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </Card>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about vulnerability scanning, network analysis..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
