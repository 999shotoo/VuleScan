# Vercel AI SDK Documentation

## Overview

The **Vercel AI SDK** is a comprehensive TypeScript toolkit for building AI-powered applications with React, Next.js, Vue, Svelte, and Node.js. It provides unified interfaces for multiple AI providers, streaming support, and built-in UI components.

**Official Documentation**: https://ai-sdk.dev

**GitHub**: https://github.com/vercel/ai

---

## Table of Contents

1. [Installation](#installation)
2. [Core Packages](#core-packages)
3. [React Hooks](#react-hooks)
4. [Streaming Functions](#streaming-functions)
5. [Model Providers](#model-providers)
6. [AI SDK Core](#ai-sdk-core)
7. [Tool Calling](#tool-calling)
8. [Advanced Features](#advanced-features)
9. [Examples](#examples)

---

## Installation

### Basic Installation

```bash
npm install ai @ai-sdk/react
```

### With Specific Providers

```bash
# OpenAI
npm install ai @ai-sdk/openai

# Anthropic
npm install ai @ai-sdk/anthropic

# Google
npm install ai @ai-sdk/google

# Multiple providers
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

---

## Core Packages

### @ai-sdk/react

React hooks for building chat and completion interfaces.

```typescript
import { useChat, useCompletion, useAssistant } from '@ai-sdk/react';
```

### @ai-sdk/vue

Vue composables for AI interactions.

```typescript
import { useChat, useCompletion } from '@ai-sdk/vue';
```

### @ai-sdk/svelte

Svelte stores for AI functionality.

```typescript
import { useChat, useCompletion } from '@ai-sdk/svelte';
```

### ai

Core SDK with streaming utilities and types.

```typescript
import { 
  streamText, 
  generateText, 
  streamObject,
  generateObject,
  tool
} from 'ai';
```

---

## React Hooks

### useChat

Hook for building chat interfaces with message history management.

#### Basic Usage

```tsx
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit,
    isLoading,
    error 
  } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}

      {error && <div>Error: {error.message}</div>}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

#### Configuration Options

```typescript
const { messages, ... } = useChat({
  api: '/api/chat',              // API endpoint
  id: 'chat-1',                  // Unique chat ID
  initialMessages: [],           // Pre-populate messages
  initialInput: '',              // Initial input value
  
  // Callbacks
  onResponse: (response) => {},  // When response starts
  onFinish: (message) => {},     // When message completes
  onError: (error) => {},        // On error
  
  // Options
  body: {                        // Additional data to send
    model: 'gpt-4o',
    temperature: 0.7,
  },
  headers: {                     // Custom headers
    'Authorization': 'Bearer token',
  },
  credentials: 'include',        // Fetch credentials
  sendExtraMessageFields: true,  // Include extra message fields
  
  // Advanced
  keepLastMessageOnError: true,  // Keep failed message
  maxSteps: 5,                   // Max tool call rounds
});
```

#### Return Values

```typescript
interface UseChatReturn {
  // State
  messages: Message[];           // All messages
  input: string;                 // Current input value
  isLoading: boolean;            // Loading state
  error: Error | undefined;      // Error if any
  data: any[];                   // Custom data from server
  
  // Actions
  handleSubmit: (e: FormEvent) => void;      // Submit form
  handleInputChange: (e: ChangeEvent) => void; // Update input
  setInput: (value: string) => void;         // Set input directly
  append: (message: Message) => Promise<void>; // Add message
  reload: () => Promise<void>;               // Reload last message
  stop: () => void;                          // Stop generation
  setMessages: (messages: Message[]) => void; // Replace all messages
  
  // Advanced
  addToolResult: (result: ToolResult) => void; // Add tool result
}
```

#### Message Types

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool';
  content: string;
  createdAt?: Date;
  
  // Optional fields
  name?: string;              // Function/tool name
  function_call?: {           // For function calls
    name: string;
    arguments: string;
  };
  tool_calls?: ToolCall[];    // For tool calls
  experimental_attachments?: Attachment[]; // File attachments
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface Attachment {
  name?: string;
  contentType?: string;
  url: string;
}
```

#### Advanced Usage

**With File Attachments:**

```tsx
const { messages, append } = useChat();

const handleSubmit = async (files: File[]) => {
  const fileAttachments = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      contentType: file.type,
      url: await convertFileToDataURL(file),
    }))
  );

  await append({
    role: 'user',
    content: 'Analyze these images',
    experimental_attachments: fileAttachments,
  });
};
```

**With Custom Transport:**

```tsx
import { DefaultChatTransport } from 'ai';

const { messages } = useChat({
  transport({
    api: '/api/chat',
    body: { model: 'gpt-4o' },
  }),
});
```

**With Streaming UI:**

```tsx
const { messages } = useChat({
  api: '/api/chat',
  onResponse: (response) => {
    console.log('Stream started');
  },
  streamProtocol: 'data', // 'text' | 'data'
});

// In your API route
import { createUIMessageStreamResponse } from 'ai';

export async function POST(req: Request) {
  return createUIMessageStreamResponse({
    execute: async ({ writer }) => {
      writer.write({ type: 'text-delta', content: 'Hello ' });
      writer.write({ type: 'text-delta', content: 'world!' });
    },
  });
}
```

---

### useCompletion

Hook for text completion (single-turn) without message history.

#### Basic Usage

```tsx
import { useCompletion } from '@ai-sdk/react';

export default function Completion() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useCompletion({
    api: '/api/completion',
  });

  return (
    <div>
      <div>{completion}</div>
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Enter a prompt..."
        />
        <button type="submit" disabled={isLoading}>
          Generate
        </button>
      </form>
    </div>
  );
}
```

#### Configuration Options

```typescript
const { completion, ... } = useCompletion({
  api: '/api/completion',
  id: 'completion-1',
  initialInput: '',
  initialCompletion: '',
  
  // Callbacks
  onResponse: (response) => {},
  onFinish: (prompt, completion) => {},
  onError: (error) => {},
  
  // Options
  body: {
    model: 'gpt-4o',
    temperature: 0.8,
  },
  headers: {},
  credentials: 'include',
});
```

#### Return Values

```typescript
interface UseCompletionReturn {
  completion: string;            // Generated text
  input: string;                 // Current input
  isLoading: boolean;           // Loading state
  error: Error | undefined;     // Error if any
  
  handleSubmit: (e: FormEvent) => void;
  handleInputChange: (e: ChangeEvent) => void;
  setInput: (value: string) => void;
  setCompletion: (value: string) => void;
  complete: (prompt: string) => Promise<string>;
  stop: () => void;
}
```

---

### useAssistant

Hook for OpenAI Assistants API integration.

#### Basic Usage

```tsx
import { useAssistant } from '@ai-sdk/react';

export default function Assistant() {
  const {
    status,
    messages,
    input,
    handleInputChange,
    submitMessage,
  } = useAssistant({
    api: '/api/assistant',
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}

      <form onSubmit={(e) => {
        e.preventDefault();
        submitMessage();
      }}>
        <input
          value={input}
          onChange={handleInputChange}
          disabled={status !== 'awaiting_message'}
        />
        <button type="submit" disabled={status !== 'awaiting_message'}>
          Send
        </button>
      </form>
    </div>
  );
}
```

#### Status Types

```typescript
type AssistantStatus = 
  | 'awaiting_message'    // Ready for new message
  | 'in_progress'         // Processing
  | 'requires_action'     // Needs tool execution
  | 'completed'           // Finished
  | 'failed'              // Error occurred
  | 'cancelled';          // Cancelled by user
```

---

## Streaming Functions

### streamText

Generate streaming text responses on the server.

#### Basic Usage

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

#### Configuration

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
  ],
  
  // Generation options
  temperature: 0.7,
  maxTokens: 1000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: ['\n\n'],
  
  // Advanced
  tools: {                    // Tool definitions
    weather: tool({
      description: 'Get weather',
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        // Fetch weather
        return { temp: 72 };
      },
    }),
  },
  toolChoice: 'auto',         // 'auto' | 'required' | { type: 'tool', toolName: 'weather' }
  maxSteps: 5,               // Max tool call rounds
  
  // Callbacks
  onChunk: ({ chunk }) => {
    console.log('Chunk:', chunk);
  },
  onFinish: ({ text, usage }) => {
    console.log('Finished:', text);
    console.log('Tokens:', usage);
  },
  
  // System
  abortSignal: signal,        // AbortSignal for cancellation
  headers: {                  // Custom headers
    'X-Custom-Header': 'value',
  },
});
```

#### Return Type

```typescript
interface StreamTextResult {
  // Streaming
  toDataStream(): ReadableStream;          // Data stream
  toDataStreamResponse(): Response;         // HTTP response
  toTextStreamResponse(): Response;         // Plain text stream
  pipeDataStreamToResponse(response: Response): void;
  pipeTextStreamToResponse(response: Response): void;
  
  // Async iteration
  [Symbol.asyncIterator](): AsyncIterator<string>;
  
  // Promises
  text: Promise<string>;                   // Full text
  usage: Promise<TokenUsage>;              // Token usage
  finishReason: Promise<FinishReason>;     // Why it stopped
  toolCalls: Promise<ToolCall[]>;          // Tool calls made
  toolResults: Promise<ToolResult[]>;      // Tool results
  
  // UI Stream
  toUIMessageStream(): UIMessageStream;    // For UI components
}
```

---

### generateText

Generate complete text response (non-streaming).

#### Basic Usage

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text, usage, finishReason } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Write a haiku about programming',
});

console.log(text);
console.log('Tokens used:', usage.totalTokens);
```

#### Configuration

Same as `streamText` but returns complete results immediately:

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  messages: [...],
  temperature: 0.7,
  maxTokens: 1000,
  // ... same options as streamText
});

// Result is available immediately
console.log(result.text);
console.log(result.usage);
console.log(result.toolCalls);
```

---

### streamObject

Stream structured data (JSON) responses.

#### Basic Usage

```typescript
import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const schema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(z.string()),
    steps: z.array(z.string()),
  }),
});

const result = streamObject({
  model: openai('gpt-4o'),
  schema,
  prompt: 'Generate a recipe for chocolate chip cookies',
});

// Stream partial objects
for await (const partialObject of result.partialObjectStream) {
  console.log(partialObject);
}

// Or get final object
const { object } = await result;
console.log(object);
```

#### Return Type

```typescript
interface StreamObjectResult<T> {
  object: Promise<T>;                      // Final validated object
  partialObjectStream: AsyncIterable<DeepPartial<T>>; // Partial objects
  usage: Promise<TokenUsage>;
  finishReason: Promise<FinishReason>;
  
  toTextStreamResponse(): Response;        // Stream response
}
```

---

### generateObject

Generate complete structured data (non-streaming).

#### Basic Usage

```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { object, usage } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
  }),
  prompt: 'Analyze this article: ...',
});

console.log(object.title);
console.log(object.tags);
```

---

## Model Providers

### OpenAI

```typescript
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4o', {
  user: 'user-123',
  structuredOutputs: true,
});

// Available models
openai('gpt-4o')                 // GPT-4o
openai('gpt-4o-mini')           // GPT-4o Mini
openai('gpt-4-turbo')           // GPT-4 Turbo
openai('gpt-3.5-turbo')         // GPT-3.5 Turbo
openai('o1-preview')            // o1 Preview
openai('o1-mini')               // o1 Mini
```

#### Configuration

```typescript
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'org-123',
  project: 'proj-456',
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Custom-Header': 'value',
  },
});
```

---

### Anthropic

```typescript
import { anthropic } from '@ai-sdk/anthropic';

const model = anthropic('claude-opus-4-20250514');

// Available models
anthropic('claude-opus-4-20250514')      // Claude 4 Opus
anthropic('claude-sonnet-4-20250514')    // Claude 4 Sonnet
anthropic('claude-3-5-sonnet-20241022')  // Claude 3.5 Sonnet
anthropic('claude-3-5-haiku-20241022')   // Claude 3.5 Haiku
```

#### Configuration

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: 'https://api.anthropic.com/v1',
  headers: {},
});
```

---

### Google

```typescript
import { google } from '@ai-sdk/google';

const model = google('gemini-2.0-flash-exp');

// Available models
google('gemini-2.0-flash-exp')           // Gemini 2.0 Flash
google('gemini-2.0-flash-thinking-exp')  // Gemini 2.0 Flash Thinking
google('gemini-1.5-pro')                 // Gemini 1.5 Pro
google('gemini-1.5-flash')               // Gemini 1.5 Flash
```

#### Configuration

```typescript
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
});
```

---

### Gateway Pattern

Use multiple providers with a unified interface:

```typescript
import { gateway } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

const myGateway = gateway({
  providers: {
    openai: openai,
    anthropic: anthropic,
  },
});

// Use with model prefix
const result = await generateText({
  model: myGateway('openai/gpt-4o'),
  prompt: 'Hello!',
});

// Or
const result = await generateText({
  model: myGateway('anthropic/claude-opus-4-20250514'),
  prompt: 'Hello!',
});
```

---

## Tool Calling

### Defining Tools

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get the current weather for a location',
  parameters: z.object({
    location: z.string().describe('The city and state, e.g. San Francisco, CA'),
    unit: z.enum(['celsius', 'fahrenheit']).optional(),
  }),
  execute: async ({ location, unit = 'fahrenheit' }) => {
    // Fetch weather data
    const data = await fetchWeather(location, unit);
    return {
      location,
      temperature: data.temp,
      conditions: data.conditions,
      unit,
    };
  },
});
```

### Using Tools

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = streamText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'user', content: 'What's the weather in New York?' },
  ],
  tools: {
    weather: weatherTool,
    search: searchTool,
  },
  toolChoice: 'auto', // Let model decide when to use tools
  maxSteps: 5,        // Maximum rounds of tool calls
});

// Access tool calls
const { toolCalls, toolResults } = await result;
console.log('Tools called:', toolCalls);
console.log('Results:', toolResults);
```

### Tool Choice Options

```typescript
// Let model decide
toolChoice: 'auto'

// Force tool usage
toolChoice: 'required'

// Specify a tool
toolChoice: { 
  type: 'tool', 
  toolName: 'weather' 
}

// Disable tools
toolChoice: 'none'
```

### Multi-Step Tool Calls

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages: [
    { 
      role: 'user', 
      content: 'Search for React tutorials and summarize the first result' 
    },
  ],
  tools: {
    search: searchTool,
    readUrl: readUrlTool,
    summarize: summarizeTool,
  },
  maxSteps: 10, // Allow multiple tool call rounds
  
  onStepFinish: ({ stepType, toolCalls }) => {
    console.log(`Step completed: ${stepType}`);
    console.log('Tools used:', toolCalls);
  },
});
```

---

## Advanced Features

### Message Streaming Protocols

#### Data Protocol (Recommended)

```typescript
// Server
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4o'),
  messages,
});

return result.toDataStreamResponse();

// Client
const { messages } = useChat({
  api: '/api/chat',
  streamProtocol: 'data', // Default
});
```

#### Text Protocol

```typescript
// Server
return result.toTextStreamResponse();

// Client
const { messages } = useChat({
  api: '/api/chat',
  streamProtocol: 'text',
});
```

---

### Custom Data Streaming

Send custom data alongside text:

```typescript
// Server
import { createDataStreamResponse } from 'ai';

return createDataStreamResponse({
  execute: (dataStream) => {
    dataStream.writeData('custom-event');
    dataStream.writeData({ type: 'status', value: 'processing' });
    
    const result = streamText({
      model: openai('gpt-4o'),
      messages,
    });
    
    result.mergeIntoDataStream(dataStream);
  },
});

// Client
const { messages, data } = useChat({
  api: '/api/chat',
});

// data contains custom events
console.log(data); // ['custom-event', { type: 'status', value: 'processing' }]
```

---

### UI Message Streams

Create custom UI components that stream:

```typescript
// Server
import { createUIMessageStreamResponse } from 'ai';

export async function POST(req: Request) {
  return createUIMessageStreamResponse({
    execute: async ({ writer }) => {
      // Send text
      writer.write({ 
        type: 'text-delta', 
        content: 'Hello ' 
      });
      
      // Send custom UI
      writer.write({
        type: 'ui-delta',
        content: '<LoadingSpinner />',
      });
      
      // Send data
      writer.write({
        type: 'data-custom',
        data: { status: 'complete' },
      });
      
      // Merge with AI stream
      const result = streamText({
        model: openai('gpt-4o'),
        messages,
      });
      
      writer.merge(result.toUIMessageStream());
    },
  });
}
```

---

### Embeddings

Generate vector embeddings:

```typescript
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// Single embedding
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'Hello, world!',
});

console.log(embedding); // [0.1, -0.2, 0.3, ...]

// Multiple embeddings
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: ['First text', 'Second text', 'Third text'],
});

console.log(embeddings.length); // 3
```

---

### Token Usage

Track token consumption:

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  messages,
});

console.log('Prompt tokens:', result.usage.promptTokens);
console.log('Completion tokens:', result.usage.completionTokens);
console.log('Total tokens:', result.usage.totalTokens);
```

---

### Abort Requests

Cancel ongoing requests:

```typescript
const abortController = new AbortController();

const result = streamText({
  model: openai('gpt-4o'),
  messages,
  abortSignal: abortController.signal,
});

// Cancel after 5 seconds
setTimeout(() => {
  abortController.abort();
}, 5000);
```

---

### Error Handling

```typescript
try {
  const result = await generateText({
    model: openai('gpt-4o'),
    messages,
  });
} catch (error) {
  if (error instanceof AISDKError) {
    console.error('AI SDK Error:', error.message);
    console.error('Cause:', error.cause);
  } else {
    console.error('Unexpected error:', error);
  }
}

// With useChat
const { error } = useChat({
  api: '/api/chat',
  onError: (error) => {
    console.error('Chat error:', error);
    toast.error(error.message);
  },
});
```

---

## Examples

### Complete Chat Application

```tsx
// app/page.tsx
"use client";

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function ChatPage() {
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit,
    isLoading,
    stop,
    reload,
    append,
  } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! How can I help you today?',
      },
    ],
    body: {
      model: 'gpt-4o',
    },
    onFinish: (message) => {
      console.log('Message completed:', message);
    },
  });

  const [model, setModel] = useState('gpt-4o');

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      {/* Model selector */}
      <select 
        value={model} 
        onChange={(e) => setModel(e.target.value)}
        className="mb-4 p-2 border rounded"
      >
        <option value="gpt-4o">GPT-4o</option>
        <option value="gpt-4o-mini">GPT-4o Mini</option>
        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
      </select>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <p className="font-bold mb-2 capitalize">{message.role}</p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
        {isLoading && (
          <button
            type="button"
            onClick={stop}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Stop
          </button>
        )}
      </form>

      {/* Quick actions */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => reload()}
          disabled={isLoading || messages.length === 0}
          className="px-3 py-1 text-sm bg-gray-200 rounded disabled:bg-gray-100"
        >
          Regenerate
        </button>
        <button
          onClick={() => append({
            role: 'user',
            content: 'Tell me a joke',
          })}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-gray-200 rounded disabled:bg-gray-100"
        >
          Tell me a joke
        </button>
      </div>
    </div>
  );
}
```

### API Route with Tools

```typescript
// app/api/chat/route.ts
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools: {
      weather: tool({
        description: 'Get the current weather for a location',
        parameters: z.object({
          location: z.string().describe('City and state, e.g. San Francisco, CA'),
        }),
        execute: async ({ location }) => {
          // Mock weather API call
          return {
            location,
            temperature: 72,
            conditions: 'Sunny',
          };
        },
      }),
      search: tool({
        description: 'Search the web for information',
        parameters: z.object({
          query: z.string().describe('Search query'),
        }),
        execute: async ({ query }) => {
          // Mock search API call
          return {
            results: [
              { title: 'Result 1', url: 'https://example.com/1' },
              { title: 'Result 2', url: 'https://example.com/2' },
            ],
          };
        },
      }),
    },
    maxSteps: 5,
    onStepFinish: ({ stepType, toolCalls }) => {
      console.log(`Step: ${stepType}`, toolCalls);
    },
  });

  return result.toDataStreamResponse();
}
```

### Completion with Structured Output

```typescript
// app/api/analyze/route.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const analysisSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  score: z.number().min(0).max(1),
  summary: z.string(),
  keywords: z.array(z.string()),
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['person', 'organization', 'location']),
  })),
});

export async function POST(req: Request) {
  const { text } = await req.json();

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: analysisSchema,
    prompt: `Analyze the following text and provide sentiment analysis, summary, keywords, and entities:\n\n${text}`,
  });

  return Response.json(object);
}
```

---

## Type Definitions

### Core Types

```typescript
// Message types
type Role = 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool';

interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt?: Date;
  name?: string;
  function_call?: FunctionCall;
  tool_calls?: ToolCall[];
  experimental_attachments?: Attachment[];
}

// Token usage
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Finish reasons
type FinishReason = 
  | 'stop'              // Natural stop
  | 'length'            // Max tokens reached
  | 'content-filter'    // Content filtered
  | 'tool-calls'        // Tool calls made
  | 'error'             // Error occurred
  | 'other'             // Other reason
  | 'unknown';          // Unknown

// Tool types
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
}
```

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
const { error } = useChat({
  api: '/api/chat',
  onError: (error) => {
    if (error.message.includes('rate limit')) {
      toast.error('Too many requests. Please try again later.');
    } else {
      toast.error('An error occurred. Please try again.');
    }
  },
});
```

### 2. Token Management

Monitor and limit token usage:

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  messages,
  maxTokens: 1000, // Limit completion length
});

console.log('Tokens used:', result.usage.totalTokens);
```

### 3. Streaming UI

Provide visual feedback during streaming:

```tsx
const { isLoading } = useChat();

{isLoading && (
  <div className="flex items-center gap-2">
    <Spinner />
    <span>AI is thinking...</span>
  </div>
)}
```

### 4. Tool Validation

Validate tool parameters:

```typescript
const weatherTool = tool({
  description: 'Get weather',
  parameters: z.object({
    location: z.string()
      .min(1, 'Location is required')
      .regex(/^[a-zA-Z\s,]+$/, 'Invalid location format'),
    unit: z.enum(['celsius', 'fahrenheit']).default('fahrenheit'),
  }),
  execute: async ({ location, unit }) => {
    // Implementation
  },
});
```

### 5. Caching

Cache responses when appropriate:

```typescript
const cache = new Map();

const getCachedResponse = async (prompt: string) => {
  if (cache.has(prompt)) {
    return cache.get(prompt);
  }

  const result = await generateText({
    model: openai('gpt-4o'),
    prompt,
  });

  cache.set(prompt, result.text);
  return result.text;
};
```

---

## Resources

- **Official Documentation**: https://ai-sdk.dev
- **GitHub**: https://github.com/vercel/ai
- **Examples**: https://ai-sdk.dev/examples
- **API Reference**: https://ai-sdk.dev/docs/reference

---

**Last Updated**: February 2026
