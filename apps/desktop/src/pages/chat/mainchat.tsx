import React from 'react'
import { useParams, useLocation } from 'react-router-dom'
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/src/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/src/components/ai-elements/prompt-input";
import { GlobeIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { getChatById, createNewChat, updateChatMessages } from '../../lib/chat-storage';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/src/components/ai-elements/message";
import { DefaultChatTransport } from 'ai';
const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) {
    return null;
  }
  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};
const models = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "claude-opus-4-20250514", name: "Claude 4 Opus" },
];

export const MainChat = () => {
  const params = useParams()
  const location = useLocation()
  const sessionId = params.id || Date.now().toString();
  const [text, setText] = useState<string>("");
  const [model, setModel] = useState<string>(models[0].id);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const { messages, sendMessage, status, setMessages } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "http://localhost:3000/api/chat",
    }),
  });

  // Load chat from localStorage on mount
  useEffect(() => {
    let existingChat = getChatById(sessionId);
    
    if (!existingChat) {
      // Create new chat if it doesn't exist
      existingChat = createNewChat(sessionId);
    }
    
    if (existingChat.messages.length > 0) {
      setMessages(existingChat.messages);
      setInitialMessageSent(true);
    }
  }, [sessionId]);

  // Handle initial message from navigation state
  useEffect(() => {
    const initialMessage = (location.state as any)?.initialMessage;
    if (initialMessage && !initialMessageSent && messages.length === 0) {
      sendMessage(
        { text: initialMessage, files: [] },
        { body: { model: model, webSearch: useWebSearch } }
      );
      setInitialMessageSent(true);
    }
  }, [location.state, initialMessageSent, messages.length]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      updateChatMessages(sessionId, messages);
    }
  }, [messages, sessionId]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }
    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
          webSearch: useWebSearch,
        },
      }
    );
    setText("");
  };
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full py-4">
        <Conversation className="flex-1 overflow-y-auto">
          <ConversationContent className="px-6">
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <MessageResponse key={`${message.id}-${i}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="shrink-0 border-t px-4 pt-4 bg-background">
          <PromptInput
            onSubmit={handleSubmit}
            globalDrop
            multiple
          >
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setText(e.target.value)}
                value={text}
                placeholder="What would you like to know?"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputButton
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  tooltip={{ content: "Search the web", shortcut: "⌘K" }}
                  variant={useWebSearch ? "default" : "ghost"}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <PromptInputSelect
                  onValueChange={(value) => {
                    setModel(value);
                  }}
                  value={model}
                >
                  <PromptInputSelectTrigger>
                    <PromptInputSelectValue />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {models.map((model) => (
                      <PromptInputSelectItem key={model.id} value={model.id}>
                        {model.name}
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
              <PromptInputSubmit disabled={!text && !status} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}
