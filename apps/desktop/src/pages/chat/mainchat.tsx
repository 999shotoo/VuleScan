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
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/src/components/ai-elements/prompt-input";
import { PaperclipIcon, CopyIcon, RefreshCcwIcon, FileIcon, EyeIcon } from "lucide-react";
import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useChat } from "@ai-sdk/react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/src/components/ai-elements/model-selector";
import { Button } from "@/src/components/ui/button";
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
  MessageActions,
  MessageAction,
} from "@/src/components/ai-elements/message";
import { Persona } from "@/src/components/ai-elements/persona";
import { Image as AIImage } from "@/src/components/ai-elements/image";
import { CodeBlock, CodeBlockHeader, CodeBlockTitle, CodeBlockFilename, CodeBlockActions, CodeBlockCopyButton } from "@/src/components/ai-elements/code-block";
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from "@/src/components/ai-elements/task";
import { WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewUrl } from "@/src/components/ai-elements/web-preview";
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

// Component to render text with HTML code blocks as interactive previews
interface TextWithHtmlPreviewProps {
  text: string;
  onPreview: (html: string) => void;
  messageId: string;
  partIndex: number;
}

const TextWithHtmlPreview = ({ text, onPreview, messageId, partIndex }: TextWithHtmlPreviewProps) => {
  const htmlCodeBlockRegex = /```html(?:\s+[^\n]+)?\n([\s\S]*?)```/g;
  
  const segments: Array<{ type: 'text' | 'html', content: string, index: number }> = [];
  let lastIndex = 0;
  let match;
  let htmlBlockIndex = 0;
  
  while ((match = htmlCodeBlockRegex.exec(text)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
        index: segments.length
      });
    }
    
    // Add the HTML code block
    segments.push({
      type: 'html',
      content: match[1],
      index: htmlBlockIndex++
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last code block
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
      index: segments.length
    });
  }
  
  // If no HTML blocks found, just render as MessageResponse
  if (segments.length === 0 || segments.every(s => s.type === 'text')) {
    return (
      <MessageResponse className="[&_pre]:overflow-x-auto [&>pre]:!my-0">
        {text}
      </MessageResponse>
    );
  }
  
  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
      {segments.map((segment, idx) => {
        if (segment.type === 'text') {
          return (
            <MessageResponse 
              key={`${messageId}-${partIndex}-text-${idx}`}
              className="[&_pre]:overflow-x-auto [&>pre]:!my-0"
            >
              {segment.content}
            </MessageResponse>
          );
        } else {
          return (
            <div key={`${messageId}-${partIndex}-html-${idx}`} className="my-2" style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
              <CodeBlock code={segment.content} language="html">
                <CodeBlockHeader>
                  <CodeBlockTitle>
                    <FileIcon size={14} />
                    <CodeBlockFilename>index.html</CodeBlockFilename>
                  </CodeBlockTitle>
                  <CodeBlockActions>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => onPreview(segment.content)}
                      title="Open preview"
                    >
                      <EyeIcon size={14} />
                    </Button>
                    <CodeBlockCopyButton />
                  </CodeBlockActions>
                </CodeBlockHeader>
              </CodeBlock>
            </div>
          );
        }
      })}
    </div>
  );
};

// ModelItem component for rendering each model
interface ModelItemProps {
  model: typeof models[0];
  onSelect: (id: string) => void;
}

const ModelItem = memo(({ model, onSelect }: ModelItemProps) => {
  const handleSelect = useCallback(
    () => onSelect(model.id),
    [onSelect, model.id]
  );
  return (
    <ModelSelectorItem
      key={model.id}
      onSelect={handleSelect}
      value={model.id}
      className="my-1 rounded-md data-selected:bg-accent/70 data-selected:text-accent-foreground"
    >
      <ModelSelectorLogo provider={model.chefSlug} />
      <ModelSelectorName>{model.name}</ModelSelectorName>
    </ModelSelectorItem>
  );
});

ModelItem.displayName = "ModelItem";

const extractLatestHtmlPreview = (chatMessages: any[]): string | null => {
  const htmlRegex = /```html(?:\s+[^\n]+)?\n([\s\S]*?)```/;

  for (let i = chatMessages.length - 1; i >= 0; i -= 1) {
    const message = chatMessages[i];
    if (message?.role !== 'assistant' || !Array.isArray(message?.parts)) {
      continue;
    }

    for (const part of message.parts) {
      if (part?.type !== 'text' || typeof part?.text !== 'string') {
        continue;
      }

      const match = part.text.match(htmlRegex);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
};

const models = [
  { id: "openai/gpt-4o", name: "GPT-4o", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/gpt-5", name: "GPT-5", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/gpt-5.2", name: "GPT-5.2", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/o3", name: "O3", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/o3-mini", name: "O3 Mini", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
  { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", chef: "Google", chefSlug: "google", providers: ["google"] },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", chef: "Google", chefSlug: "google", providers: ["google"] },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", chef: "Google", chefSlug: "google", providers: ["google"] },
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash", chef: "Google", chefSlug: "google", providers: ["google"] },
  { id: "deepseek/deepseek-v3", name: "DeepSeek v3", chef: "DeepSeek", chefSlug: "deepseek", providers: ["deepseek"] },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek v3.2", chef: "DeepSeek", chefSlug: "deepseek", providers: ["deepseek"] },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", chef: "DeepSeek", chefSlug: "deepseek", providers: ["deepseek"] },
  { id: "xai/grok-4", name: "Grok 4", chef: "xAI", chefSlug: "xai", providers: ["xai"] },
  { id: "xai/grok-3", name: "Grok 3", chef: "xAI", chefSlug: "xai", providers: ["xai"] },
  { id: "meta/llama-3.3-70b", name: "Llama 3.3 70B", chef: "Meta", chefSlug: "llama", providers: ["meta"] },
  { id: "meta/llama-3.1-70b", name: "Llama 3.1 70B", chef: "Meta", chefSlug: "llama", providers: ["meta"] },
  { id: "mistral/mistral-large-3", name: "Mistral Large 3", chef: "Mistral AI", chefSlug: "mistral", providers: ["mistral"] },
  { id: "mistral/mistral-medium", name: "Mistral Medium", chef: "Mistral AI", chefSlug: "mistral", providers: ["mistral"] },
  { id: "alibaba/qwen3-max", name: "Qwen3 Max", chef: "Alibaba", chefSlug: "alibaba", providers: ["alibaba"] },
  { id: "alibaba/qwen3-coder", name: "Qwen3 Coder", chef: "Alibaba", chefSlug: "alibaba", providers: ["alibaba"] },
  { id: "perplexity/sonar-pro", name: "Sonar Pro", chef: "Perplexity", chefSlug: "perplexity", providers: ["perplexity"] },
  { id: "perplexity/sonar", name: "Sonar", chef: "Perplexity", chefSlug: "perplexity", providers: ["perplexity"] },
  { id: "kwaipilot/kat-coder-pro-v1", name: "Kat Coder Pro v1", chef: "Kwaipilot", chefSlug: "kwaipilot", providers: ["kwaipilot"] },
];

export const MainChat = () => {
  const params = useParams()
  const location = useLocation()
  const fallbackSessionIdRef = useRef(Date.now().toString());
  const sessionId = params.id ?? fallbackSessionIdRef.current;
  const [text, setText] = useState<string>("");
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const initialMessageSentForSession = useRef<Set<string>>(new Set());
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSwitchingChat, setIsSwitchingChat] = useState(false);
  
  const { messages, sendMessage, status, setMessages, error, regenerate, stop } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "http://localhost:3000/api/chat",
    }),
  });

  // Extract HTML from latest message for preview
  useEffect(() => {
    const nextPreviewHtml = extractLatestHtmlPreview(messages as any[]);
    setPreviewHtml(nextPreviewHtml);
    setShowPreview(Boolean(nextPreviewHtml));
  }, [messages]);

  // Load chat from localStorage on mount
  useEffect(() => {
    setIsSwitchingChat(true);
    setMessages([]);
    setInitialMessageSent(false);
    
    let existingChat = getChatById(sessionId);

    if (!existingChat) {
      // Create new chat if it doesn't exist
      existingChat = createNewChat(sessionId);
    }

    if (existingChat.messages.length > 0) {
      setMessages(existingChat.messages);
      setInitialMessageSent(true);
      const savedPreviewHtml = extractLatestHtmlPreview(existingChat.messages as any[]);
      setPreviewHtml(savedPreviewHtml);
      setShowPreview(Boolean(savedPreviewHtml));
    } else {
      setMessages([]);
      setPreviewHtml(null);
      setShowPreview(false);
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setIsSwitchingChat(false);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [sessionId, setMessages]);

  // Handle initial message from navigation state
  useEffect(() => {
    const initialMessage = (location.state as any)?.initialMessage;
    if (
      initialMessage &&
      !initialMessageSent &&
      messages.length === 0 &&
      !initialMessageSentForSession.current.has(sessionId)
    ) {
      // Guard against duplicate sends caused by Strict Mode effect re-runs.
      initialMessageSentForSession.current.add(sessionId);
      sendMessage(
        { text: initialMessage, files: [] },
        { body: { model: model } }
      );
      setInitialMessageSent(true);
    }
  }, [location.state, initialMessageSent, messages.length, sessionId, model, sendMessage]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      updateChatMessages(sessionId, messages);
    }
  }, [messages, sessionId]);

  const handleSubmit = useCallback(async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || "Please analyze these attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
        },
      }
    );
    setText("");
  }, [sendMessage, model]);

  const handleModelSelect = useCallback((id: string) => {
    setModel(id);
    setModelSelectorOpen(false);
  }, []);

  const selectedModelData = models.find((m) => m.id === model);
  const chefs = [...new Set(models.map((m) => m.chef))];

  const isStreaming = status === "streaming" || status === "submitted";

  // Debug log
  console.log("Chat State:", { status, isStreaming, messagesCount: messages.length });

  // Handler to open preview with specific HTML
  const handleOpenPreview = useCallback((html: string) => {
    setPreviewHtml(html);
    setShowPreview(true);
  }, []);

  // Keep preview URL stable until preview HTML actually changes to avoid iframe flicker.
  useEffect(() => {
    if (!previewHtml) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(new Blob([previewHtml], { type: 'text/html' }));
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [previewHtml]);

  const hasPreview = showPreview && Boolean(previewHtml) && Boolean(previewUrl);

  return (
    <div className="h-full flex flex-row" style={{ overflow: 'hidden', width: '100%' }}>
      {/* LEFT SIDE: Chat */}
      <div
        className="flex flex-col transition-[width] duration-300 ease-out"
        style={{
          overflow: 'hidden',
          minWidth: 0,
          width: hasPreview ? '56%' : '100%',
        }}
      >
        <div
          className={`flex-1 flex flex-col transition-opacity duration-200 ${isSwitchingChat ? 'opacity-0' : 'opacity-100'}`}
          style={{ overflow: 'hidden', minWidth: 0 }}
        >
          <Conversation className="overflow-hidden">
            <ConversationContent className="px-6 py-4 mx-auto max-w-3xl xl:max-w-7xl ">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <h2 className="text-2xl font-semibold">Welcome to VuleScan AI Chat</h2>
                <p className="text-muted-foreground max-w-md">
                  Start a conversation with AI. You can upload images and choose from 100+ AI models.
                </p>
              </div>
            )}
            {messages.map((message, msgIndex) => (
              <div key={`${message.id}-${msgIndex}`} className="mb-4" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                <Message from={message.role}>
                  <div className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`} style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    {/* Avatar */}
                    <div className="shrink-0">
                      {message.role === "assistant" ? (
                        <Persona
                          variant="obsidian"
                          state="idle"
                          className="size-8"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          U
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0 overflow-hidden box-border max-w-full">
                      <MessageContent className="break-words overflow-hidden box-border max-w-full">
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case "text":
                              return (
                                <TextWithHtmlPreview
                                  key={`${message.id}-part-${i}`}
                                  text={part.text}
                                  onPreview={handleOpenPreview}
                                  messageId={message.id}
                                  partIndex={i}
                                />
                              );
                            case "image":
                              // Check if it's a base64 data URL or regular URL
                              const imageUrl = part.image;
                              if (imageUrl.startsWith('data:')) {
                                // Extract base64 and media type from data URL
                                const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
                                if (matches) {
                                  return (
                                    <AIImage
                                      key={`${message.id}-part-${i}`}
                                      base64={matches[2]}
                                      mediaType={matches[1] as any}
                                      alt="Uploaded image"
                                      className="max-w-full w-auto h-auto"
                                    />
                                  );
                                }
                              }
                              // Fallback to regular img tag for non-data URLs
                              return (
                                <div key={`${message.id}-part-${i}`} className="my-2 max-w-full overflow-hidden">
                                  <img
                                    src={imageUrl}
                                    alt="Image"
                                    className="max-w-full w-auto h-auto rounded-lg border"
                                  />
                                </div>
                              );
                            case "file":
                              // Handle file attachments - images and other files
                              if (part.mediaType?.startsWith('image/')) {
                                return (
                                  <div key={`${message.id}-part-${i}`} className="my-2 max-w-full overflow-hidden">
                                    <img
                                      src={part.url}
                                      alt={part.filename || 'Uploaded image'}
                                      className="max-w-full w-auto h-auto rounded-lg border"
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div key={`${message.id}-part-${i}`} className="my-2">
                                  <TaskItemFile>
                                    <PaperclipIcon className="h-3 w-3" />
                                    <span>{part.filename || 'File attachment'}</span>
                                  </TaskItemFile>
                                </div>
                              );
                            case "tool-call":
                              return (
                                <div key={`${message.id}-part-${i}`} className="max-w-full overflow-hidden">
                                  <Task defaultOpen={true}>
                                    <TaskTrigger title={`Using tool: ${part.toolName}`} />
                                    <TaskContent>
                                      <TaskItem>
                                        <CodeBlock 
                                          code={JSON.stringify(part.args, null, 2)} 
                                          language="json"
                                        >
                                          <CodeBlockHeader>
                                            <CodeBlockTitle>
                                              <FileIcon size={14} />
                                              <CodeBlockFilename>arguments.json</CodeBlockFilename>
                                            </CodeBlockTitle>
                                            <CodeBlockActions>
                                              <CodeBlockCopyButton />
                                            </CodeBlockActions>
                                          </CodeBlockHeader>
                                        </CodeBlock>
                                      </TaskItem>
                                    </TaskContent>
                                  </Task>
                                </div>
                              );
                            case "tool-result":
                              return (
                                <div key={`${message.id}-part-${i}`} className="max-w-full overflow-hidden">
                                  <Task defaultOpen={false}>
                                    <TaskTrigger title="Tool Result" />
                                    <TaskContent>
                                      <TaskItem>
                                        <CodeBlock 
                                          code={JSON.stringify(part.result, null, 2)} 
                                          language="json"
                                        >
                                          <CodeBlockHeader>
                                            <CodeBlockTitle>
                                              <FileIcon size={14} />
                                              <CodeBlockFilename>result.json</CodeBlockFilename>
                                            </CodeBlockTitle>
                                            <CodeBlockActions>
                                              <CodeBlockCopyButton />
                                            </CodeBlockActions>
                                          </CodeBlockHeader>
                                        </CodeBlock>
                                      </TaskItem>
                                    </TaskContent>
                                  </Task>
                                </div>
                              );
                            default:
                              return null;
                          }
                        })}
                      </MessageContent>

                      {/* Message Actions - only show for completed assistant messages */}
                      {message.role === "assistant" &&
                        message.parts.length > 0 &&
                        !(isStreaming && msgIndex === messages.length - 1) && (
                          <MessageActions className="mt-2">
                            <MessageAction
                              label="Copy"
                              onClick={async () => {
                                const textContent = message.parts
                                  .filter((p) => p.type === "text")
                                  .map((p) => (p as any).text)
                                  .join("\n");
                                if (textContent) {
                                  try {
                                    await navigator.clipboard.writeText(textContent);
                                  } catch (err) {
                                    console.error('Failed to copy:', err);
                                  }
                                }
                              }}
                              tooltip="Copy to clipboard"
                              size="icon-sm"
                            >
                              <CopyIcon className="size-4" />
                            </MessageAction>
                            <MessageAction
                              label="Regenerate"
                              onClick={async () => {
                                try {
                                  await regenerate({
                                    messageId: message.id,
                                    body: { model }
                                  });
                                } catch (err) {
                                  console.error('Failed to regenerate:', err);
                                }
                              }}
                              tooltip="Regenerate response"
                              size="icon-sm"
                            >
                              <RefreshCcwIcon className="size-4" />
                            </MessageAction>
                          </MessageActions>
                        )}
                    </div>
                  </div>
                </Message>
              </div>
            ))}

            {/* Thinking indicator - show when AI is processing and no response yet */}
            {isStreaming && (
              messages.length === 0 ||
              messages[messages.length - 1]?.role === "user" ||
              (messages[messages.length - 1]?.role === "assistant" &&
                messages[messages.length - 1]?.parts.length === 0)
            ) && (
                <Message from="assistant">
                  <div className="flex gap-3 w-full">
                    <div className="shrink-0">
                      <Persona
                        variant="obsidian"
                        state="thinking"
                        className="size-8"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <MessageContent>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="flex gap-1">
                            <span className="inline-block animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                            <span className="inline-block animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                            <span className="inline-block animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                          </div>
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </MessageContent>
                    </div>
                  </div>
                </Message>
              )}

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
                <strong className="font-semibold">Error:</strong>
                <p className="text-sm mt-1">{error.message}</p>
                <button
                  onClick={async () => {
                    try {
                      await regenerate({ body: { model } });
                    } catch (err) {
                      console.error('Failed to retry:', err);
                    }
                  }}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        
        <div className="shrink-0 border-t px-4 pt-4 pb-4 bg-background">
          <div className="max-w-3xl xl:max-w-7xl mx-auto w-full">
            <PromptInput
            onSubmit={handleSubmit}
            globalDrop
            multiple
            accept="image/*,application/pdf,.txt,.doc,.docx"
            maxFileSize={10 * 1024 * 1024} // 10MB
            onError={(error) => {
              console.error('File upload error:', error);
            }}
          >
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setText(e.target.value)}
                value={text}
                placeholder="What would you like to know? (Supports images, PDFs, and text files)"
                disabled={isStreaming}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                {!isStreaming ? (
                  <>
                    <PromptInputActionMenu>
                      <PromptInputActionMenuTrigger />
                      <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments />
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu>

                    <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
                      <ModelSelectorTrigger asChild>
                        <Button className="h-9 min-w-[180px] justify-start gap-2" variant="outline" size="sm">
                          {selectedModelData?.chefSlug && (
                            <ModelSelectorLogo provider={selectedModelData.chefSlug} />
                          )}
                          {selectedModelData?.name && (
                            <ModelSelectorName className="text-xs">{selectedModelData.name}</ModelSelectorName>
                          )}
                        </Button>
                      </ModelSelectorTrigger>
                      <ModelSelectorContent className="w-[380px] max-w-[calc(100vw-2rem)] border border-border/80 bg-popover/95 shadow-2xl backdrop-blur-sm">
                        <ModelSelectorInput placeholder="Search models..." />
                        <ModelSelectorList>
                          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                          {chefs.map((chef) => (
                            <ModelSelectorGroup heading={chef} key={chef}>
                              {models
                                .filter((m) => m.chef === chef)
                                .map((m) => (
                                  <ModelItem
                                    key={m.id}
                                    model={m}
                                    onSelect={handleModelSelect}
                                  />
                                ))}
                            </ModelSelectorGroup>
                          ))}
                        </ModelSelectorList>
                      </ModelSelectorContent>
                    </ModelSelector>
                  </>
                ) : (
                  <div className="flex items-center">
                    <Button variant="destructive" size="sm" onClick={() => stop()}>
                      Stop
                    </Button>
                  </div>
                )}
              </PromptInputTools>
              <div className="ml-2">
                {!isStreaming ? (
                  <PromptInputSubmit disabled={isStreaming} status={status} />
                ) : (
                  <PromptInputSubmit disabled />
                )}
              </div>
            </PromptInputFooter>
          </PromptInput>
          </div>
        </div>
        </div>
      </div>
      
      {/* RIGHT SIDE: Preview Panel */}
      <div
        className="flex flex-col h-full transition-[width,opacity] duration-300 ease-out"
        style={{
          overflow: 'hidden',
          minWidth: 0,
          width: hasPreview ? '44%' : '0%',
          opacity: hasPreview ? 1 : 0,
          borderLeftWidth: hasPreview ? 1 : 0,
          borderLeftStyle: 'solid',
        }}
      >
        {previewUrl && (
          <WebPreview defaultUrl={previewUrl} className="h-full w-full rounded-none border-0 overflow-hidden">
            <WebPreviewNavigation className="bg-muted border-b border-border">
              <WebPreviewUrl className="bg-background" />
            </WebPreviewNavigation>
            <WebPreviewBody 
              src={previewUrl} 
              className="flex-1 bg-white dark:bg-white" 
            />
          </WebPreview>
        )}
      </div>
    </div>
  )
}
