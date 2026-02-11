import { useState, useCallback } from 'react';
import { sendChatMessage, clearConversation, ChatMessage, ChatResponse } from '../lib/api-client';
import { Button } from './ui/button';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from './ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputBody,
} from './ai-elements/prompt-input';
import { Suggestion, Suggestions } from './ai-elements/suggestion';
import { MessageSquare, ShieldCheck } from 'lucide-react';
import { Tool, ToolHeader, ToolContent } from './ai-elements/tool';
import { cn } from '../lib/utils';

interface ChatInterfaceAIProps {
  sessionId?: string;
  onClear?: () => void;
}

const suggestions = [
  "Scan network for vulnerabilities",
  "Find subdomains for a domain",
  "Check for open ports",
  "Perform directory enumeration",
  "Analyze security headers",
  "Test for SQL injection",
];

export function ChatInterfaceAI({ sessionId = 'default', onClear }: ChatInterfaceAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const [toolResults, setToolResults] = useState<any[]>([]);

  const handleSend = useCallback(async (message: { text: string; files: any[] }) => {
    if (!message.text.trim() || isLoading) return;

    setInputText('');

    const userMessage: ChatMessage = {
      role: 'user',
      content: message.text,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentResponse('');
    setToolCalls([]);
    setToolResults([]);

    let fullResponse = '';

    try {
      await sendChatMessage([userMessage], sessionId, (response: ChatResponse) => {
        if (response.type === 'text') {
          fullResponse += response.content;
          setCurrentResponse(fullResponse);
        } else if (response.type === 'toolCalls') {
          setToolCalls(response.content);
        } else if (response.type === 'toolResults') {
          setToolResults(response.content);
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
      setToolCalls([]);
      setToolResults([]);
    }
  }, [isLoading, sessionId]);

  const handleClear = async () => {
    try {
      await clearConversation(sessionId);
      setMessages([]);
      setCurrentResponse('');
      setInputText('');
      if (onClear) onClear();
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value),
    []
  );

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputText(suggestion);
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Security Assistant</h2>
            <p className="text-xs text-muted-foreground">Powered by Vercel AI SDK</p>
          </div>
        </div>
        <Button onClick={handleClear} variant="outline" size="sm">
          Clear Chat
        </Button>
      </div>

      {/* Messages */}
      <Conversation className="flex-1">
        <ConversationContent className="gap-6 p-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="p-4 rounded-2xl bg-primary/5 mb-6">
                <MessageSquare className="h-12 w-12 text-primary/40" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Start a security conversation</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                Ask me about vulnerability scanning, network analysis, penetration testing, or security best practices
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <Message key={index} from={message.role}>
              <MessageContent
                className={cn(
                  message.role === 'user'
                    ? 'rounded-2xl bg-primary/10 px-4 py-3'
                    : ''
                )}
              >
                {message.role === 'assistant' ? (
                  <MessageResponse>{message.content}</MessageResponse>
                ) : (
                  message.content
                )}
              </MessageContent>
            </Message>
          ))}

          {currentResponse && (
            <Message from="assistant">
              <MessageContent>
                <MessageResponse>{currentResponse}</MessageResponse>
              </MessageContent>
            </Message>
          )}

          {toolCalls.length > 0 && (
            <div className="space-y-3">
              {toolCalls.map((toolCall, index) => (
                <Tool key={index} defaultOpen>
                  <ToolHeader
                    type="tool-call"
                    state="output-available"
                    toolName={toolCall.toolName}
                    title={toolCall.toolName}
                  />
                  <ToolContent>
                    <div className="text-sm p-2">
                      <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(toolCall.args, null, 2)}
                      </pre>
                    </div>
                  </ToolContent>
                </Tool>
              ))}
            </div>
          )}

          {toolResults.length > 0 && (
            <div className="space-y-3">
              {toolResults.map((result, index) => (
                <Tool key={index} defaultOpen>
                  <ToolHeader
                    type="tool-result"
                    state="output-available"
                    toolName={result.toolName || 'Result'}
                    title="Result"
                  />
                  <ToolContent>
                    <div className="text-sm p-2">
                      <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  </ToolContent>
                </Tool>
              ))}
            </div>
          )}

          {isLoading && !currentResponse && (
            <Message from="assistant">
              <MessageContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Analyzing...</span>
                </div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {messages.length === 0 && !isLoading && (
          <div className="px-4 pt-4">
            <Suggestions>
              {suggestions.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  suggestion={suggestion}
                />
              ))}
            </Suggestions>
          </div>
        )}
        <div className="p-4">
          <PromptInput className="rounded-2xl border shadow-sm" onSubmit={handleSend}>
            <PromptInputBody>
              <PromptInputTextarea
                value={inputText}
                onChange={handleTextChange}
                placeholder="Ask about vulnerability scanning, network analysis..."
                disabled={isLoading}
                rows={1}
                className="min-h-[44px] max-h-[200px]"
              />
            </PromptInputBody>
            <PromptInputFooter className="p-2 justify-end">
              <PromptInputSubmit 
                disabled={isLoading || !inputText.trim()} 
                status={isLoading ? 'streaming' : 'ready'}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
