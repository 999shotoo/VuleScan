# AI Elements Documentation

## Overview

**AI Elements** is a comprehensive component library built on top of [shadcn/ui](https://ui.shadcn.com/) designed to help developers build AI-native applications faster. It provides ready-to-use, customizable components specifically tailored for AI chat interfaces, workflows, IDEs, voice agents, and more.

**Repository**: https://github.com/vercel/ai-elements

**Documentation**: https://elements.ai-sdk.dev

---

## Table of Contents

1. [Installation](#installation)
2. [Core Concepts](#core-concepts)
3. [Chatbot Components](#chatbot-components)
4. [Voice Components](#voice-components)
5. [Code Components](#code-components)
6. [Utilities](#utilities)
7. [Hooks and Context](#hooks-and-context)
8. [Advanced Usage](#advanced-usage)

---

## Installation

### Prerequisites

Before installing AI Elements, ensure you have:

- Node.js 18+ or React 18+
- shadcn/ui configured in your project
- A component directory (typically `components/ai-elements/`)

### Install All Components

```bash
npx ai-elements@latest
```

This command will:
- Set up shadcn/ui if not already configured
- Install all AI Elements components to your configured components directory
- Add necessary dependencies to your project

### Install Specific Components

```bash
# Install individual components
npx ai-elements@latest add <component-name>

# Examples
npx ai-elements@latest add message
npx ai-elements@latest add conversation
npx ai-elements@latest add prompt-input
```

### Alternative: Use with shadcn CLI

```bash
# Install all components
npx shadcn@latest add https://elements.ai-sdk.dev/api/registry/all.json

# Install a specific component
npx shadcn@latest add https://elements.ai-sdk.dev/api/registry/message.json
```

---

## Core Concepts

### Composability

AI Elements are built with composability in mind. Components are composed of smaller, reusable pieces:

```tsx
// Good: Composable approach
<Message from="assistant">
  <MessageContent>
    <MessageResponse>{text}</MessageResponse>
  </MessageContent>
</Message>

// Avoid: Monolithic approach
<Message from="assistant" content={text} />
```

### Consistency

All components follow these patterns:
- Use `cn()` for class merging
- Extend HTML primitive attributes
- Use CSS variables for theming
- Follow consistent naming conventions

### Accessibility

All components are:
- Keyboard navigable
- Screen reader friendly
- WCAG 2.1 AA compliant
- Properly labeled

---

## Chatbot Components

### Message

Display chat messages with support for streaming, branching versions, and rich content.

#### Installation

```bash
npx ai-elements@latest add message
```

#### Basic Usage

```tsx
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

<Message from="assistant">
  <MessageContent>
    <MessageResponse>Hello! How can I help you?</MessageResponse>
  </MessageContent>
</Message>
```

#### Props

**`<Message />`**

| Prop | Type | Description |
|------|------|-------------|
| `from` | `"user" \| "assistant"` | Message sender |
| `className` | `string` | Additional CSS classes |
| `children` | `ReactNode` | Message content |

**`<MessageContent />`**

Contains the message body and visual elements.

**`<MessageResponse />`**

Renders markdown content with streaming support. Uses Streamdown for rich text rendering.

```tsx
<MessageResponse>
  # This is markdown
  - Bullet points work
  - **Bold** and *italic* text
  - `code` and ```code blocks```
</MessageResponse>
```

#### Message Branching

Support multiple versions of a message:

```tsx
import {
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
} from "@/components/ai-elements/message";

const versions = [
  { id: "v1", content: "First version" },
  { id: "v2", content: "Second version" },
  { id: "v3", content: "Third version" },
];

const [currentVersion, setCurrentVersion] = useState(0);

<Message from="assistant">
  <MessageContent>
    <MessageBranch>
      <MessageBranchSelector>
        <MessageBranchPrevious 
          disabled={currentVersion === 0}
          onClick={() => setCurrentVersion(prev => prev - 1)}
        />
        <MessageBranchPage>
          {currentVersion + 1} of {versions.length}
        </MessageBranchPage>
        <MessageBranchNext 
          disabled={currentVersion === versions.length - 1}
          onClick={() => setCurrentVersion(prev => prev + 1)}
        />
      </MessageBranchSelector>
      <MessageBranchContent>
        <MessageResponse>{versions[currentVersion].content}</MessageResponse>
      </MessageBranchContent>
    </MessageBranch>
  </MessageContent>
</Message>
```

#### Message Toolbar

Add actions to messages:

```tsx
import {
  MessageToolbar,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";

<Message from="assistant">
  <MessageContent>
    <MessageResponse>Content here</MessageResponse>
  </MessageContent>
  <MessageToolbar>
    <MessageActions>
      <MessageAction 
        label="Copy" 
        onClick={handleCopy}
        icon={<CopyIcon />}
      />
      <MessageAction 
        label="Retry" 
        onClick={handleRetry}
        icon={<RefreshIcon />}
      />
    </MessageActions>
  </MessageToolbar>
</Message>
```

---

### Conversation

Container for displaying a conversation with messages, including auto-scroll and download functionality.

#### Installation

```bash
npx ai-elements@latest add conversation
```

#### Basic Usage

```tsx
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";

<Conversation>
  <ConversationContent>
    {messages.map((message) => (
      <Message key={message.id} from={message.role}>
        <MessageContent>
          <MessageResponse>{message.content}</MessageResponse>
        </MessageContent>
      </Message>
    ))}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

#### Props

**`<Conversation />`**

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Additional CSS classes |
| `initial` | `"smooth" \| "instant"` | Initial scroll behavior |
| `resize` | `"smooth" \| "instant"` | Resize scroll behavior |

**`<ConversationScrollButton />`**

Auto-appears when user scrolls up. Clicking scrolls to bottom.

#### Download Conversations

```tsx
import { ConversationDownload } from "@/components/ai-elements/conversation";

<ConversationDownload 
  messages={messages}
  filename="chat-history.txt"
  formatMessage={(msg) => `${msg.role}: ${msg.content}`}
>
  <DownloadIcon /> Download Chat
</ConversationDownload>
```

---

### Prompt Input

A comprehensive input component for sending messages with file attachments to AI models.

#### Installation

```bash
npx ai-elements@latest add prompt-input
```

#### Basic Usage

```tsx
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

const handleSubmit = (message) => {
  console.log(message.text, message.files);
};

<PromptInput onSubmit={handleSubmit}>
  <PromptInputBody>
    <PromptInputTextarea placeholder="Type a message..." />
  </PromptInputBody>
  <PromptInputFooter>
    <PromptInputTools>
      {/* Add tools here */}
    </PromptInputTools>
    <PromptInputSubmit />
  </PromptInputFooter>
</PromptInput>
```

#### Props

**`<PromptInput />`**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSubmit` | `(message, event) => void` | Required | Submit handler |
| `accept` | `string` | - | File types to accept (e.g., "image/*") |
| `multiple` | `boolean` | `false` | Allow multiple file selection |
| `globalDrop` | `boolean` | `false` | Accept drops anywhere on document |
| `maxFiles` | `number` | - | Maximum number of files |
| `maxFileSize` | `number` | - | Maximum file size in bytes |
| `onError` | `(error) => void` | - | Error handler |

#### File Attachments

```tsx
import {
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";

const AttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  
  return (
    <Attachments variant="inline">
      {attachments.files.map((file) => (
        <Attachment 
          key={file.id} 
          data={file}
          onRemove={() => attachments.remove(file.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

<PromptInput onSubmit={handleSubmit}>
  <PromptInputHeader>
    <AttachmentsDisplay />
  </PromptInputHeader>
  <PromptInputBody>
    <PromptInputTextarea />
  </PromptInputBody>
  <PromptInputFooter>
    <PromptInputTools>
      <PromptInputActionMenu>
        <PromptInputActionMenuTrigger />
        <PromptInputActionMenuContent>
          <PromptInputActionAddAttachments />
        </PromptInputActionMenuContent>
      </PromptInputActionMenu>
    </PromptInputTools>
    <PromptInputSubmit />
  </PromptInputFooter>
</PromptInput>
```

#### Model Selection

```tsx
import {
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectValue,
} from "@/components/ai-elements/prompt-input";

const models = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "claude-opus-4", name: "Claude 4 Opus" },
];

<PromptInputFooter>
  <PromptInputTools>
    <PromptInputSelect value={model} onValueChange={setModel}>
      <PromptInputSelectTrigger>
        <PromptInputSelectValue />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {models.map((m) => (
          <PromptInputSelectItem key={m.id} value={m.id}>
            {m.name}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  </PromptInputTools>
</PromptInputFooter>
```

#### Provider Pattern

Lift state outside of PromptInput:

```tsx
import {
  PromptInputProvider,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";

<PromptInputProvider initialInput="Hello">
  <YourComponent />
  <PromptInput onSubmit={handleSubmit}>
    {/* ... */}
  </PromptInput>
</PromptInputProvider>

// In YourComponent
const controller = usePromptInputController();
console.log(controller.textInput.value);
controller.textInput.setInput("New value");
```

#### Hooks

**`usePromptInputAttachments()`**

Access and manage file attachments:

```tsx
const attachments = usePromptInputAttachments();

attachments.files;              // Array of current attachments
attachments.add(files);         // Add new files
attachments.remove(id);         // Remove an attachment by ID
attachments.clear();            // Clear all attachments
attachments.openFileDialog();   // Open file selection dialog
```

**`usePromptInputController()`**

Access full controller (only with PromptInputProvider):

```tsx
const controller = usePromptInputController();

controller.textInput.value;     // Current text value
controller.textInput.setInput(value); // Set text value
controller.textInput.clear();   // Clear text
controller.attachments;         // Attachments context
```

---

### Reasoning

Display AI reasoning or thinking process with streaming support.

#### Installation

```bash
npx ai-elements@latest add reasoning
```

#### Basic Usage

```tsx
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";

<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger />
  <ReasoningContent>
    The reasoning process content here...
  </ReasoningContent>
</Reasoning>
```

#### Props

**`<Reasoning />`**

| Prop | Type | Description |
|------|------|-------------|
| `isStreaming` | `boolean` | Whether reasoning is currently streaming |
| `open` | `boolean` | Controlled open state |
| `defaultOpen` | `boolean` | Default open state |
| `onOpenChange` | `(open: boolean) => void` | Open state change handler |
| `duration` | `number` | Duration in seconds |

#### Custom Messages

```tsx
const getThinkingMessage = (isStreaming, duration) => {
  if (isStreaming) return "Thinking...";
  if (duration === undefined) return "Thought for a moment";
  return `Thought for ${duration} seconds`;
};

<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger getThinkingMessage={getThinkingMessage} />
  <ReasoningContent>Content</ReasoningContent>
</Reasoning>
```

#### Hook

```tsx
const { isStreaming, isOpen, setIsOpen, duration } = useReasoning();
```

---

### Sources

Display citations and sources used to generate responses.

#### Installation

```bash
npx ai-elements@latest add sources
```

#### Basic Usage

```tsx
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";

const sources = [
  { href: "https://example.com", title: "Example Source" },
  { href: "https://docs.com", title: "Documentation" },
];

<Sources>
  <SourcesTrigger count={sources.length} />
  <SourcesContent>
    {sources.map((source) => (
      <Source 
        key={source.href} 
        href={source.href} 
        title={source.title} 
      />
    ))}
  </SourcesContent>
</Sources>
```

#### Custom Trigger

```tsx
<Sources>
  <SourcesTrigger count={sources.length}>
    <BookIcon className="size-4" />
    <p>Using {sources.length} citations</p>
    <ChevronDownIcon className="size-4" />
  </SourcesTrigger>
  <SourcesContent>
    {/* ... */}
  </SourcesContent>
</Sources>
```

---

### Suggestions

Display clickable suggestion chips for common queries.

#### Installation

```bash
npx ai-elements@latest add suggestion
```

#### Basic Usage

```tsx
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";

const suggestions = [
  "How do I use React hooks?",
  "Explain async/await",
  "What is TypeScript?",
];

<Suggestions>
  {suggestions.map((text, index) => (
    <Suggestion 
      key={index} 
      onClick={() => handleSuggestion(text)}
    >
      {text}
    </Suggestion>
  ))}
</Suggestions>
```

---

### Attachments

Display and manage file attachments.

#### Installation

```bash
npx ai-elements@latest add attachments
```

#### Basic Usage

```tsx
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";

<Attachments variant="inline">
  {files.map((file) => (
    <Attachment key={file.id} data={file} onRemove={() => removeFile(file.id)}>
      <AttachmentPreview />
      <AttachmentInfo />
      <AttachmentRemove />
    </Attachment>
  ))}
</Attachments>
```

#### Variants

- `inline`: Horizontal layout with preview
- `list`: Vertical list layout

#### Attachment Types

Supports:
- Images (with preview)
- PDFs
- Text files
- Videos
- Audio files
- Source documents

---

### Model Selector

Select between different AI models with branded logos.

#### Installation

```bash
npx ai-elements@latest add model-selector
```

#### Basic Usage

```tsx
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorLogoGroup,
} from "@/components/ai-elements/model-selector";

const models = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai", "azure"],
  },
  // ...
];

<ModelSelector value={selectedModel} onValueChange={setSelectedModel}>
  <ModelSelectorTrigger>
    <ModelSelectorLogo provider={selectedModelSlug} />
    <ModelSelectorName>{selectedModelName}</ModelSelectorName>
  </ModelSelectorTrigger>
  <ModelSelectorContent>
    <ModelSelectorInput placeholder="Search models..." />
    <ModelSelectorList>
      <ModelSelectorEmpty>No models found</ModelSelectorEmpty>
      <ModelSelectorGroup>
        {models.map((model) => (
          <ModelSelectorItem key={model.id} value={model.id}>
            <ModelSelectorLogo provider={model.chefSlug} />
            <ModelSelectorName>{model.name}</ModelSelectorName>
            <ModelSelectorLogoGroup>
              {model.providers.map((provider) => (
                <ModelSelectorLogo key={provider} provider={provider} />
              ))}
            </ModelSelectorLogoGroup>
          </ModelSelectorItem>
        ))}
      </ModelSelectorGroup>
    </ModelSelectorList>
  </ModelSelectorContent>
</ModelSelector>
```

---

## Voice Components

### Persona

Animated AI persona with different visual styles and states.

#### Installation

```bash
npx ai-elements@latest add persona
```

#### Basic Usage

```tsx
import { Persona } from "@/components/ai-elements/persona";

<Persona 
  state="listening"  // idle | listening | thinking | speaking | asleep
  variant="opal"     // opal | obsidian | mana | glint | command
/>
```

#### States

- `idle`: Default resting state
- `listening`: Actively listening to user
- `thinking`: Processing/analyzing
- `speaking`: Generating response
- `asleep`: Inactive/paused

#### Variants

- `opal`: Blue/cyan gradient
- `obsidian`: Dark purple/blue
- `mana`: Green/teal
- `glint`: Orange/gold
- `command`: Red/pink

---

### Speech Input

Record audio input with waveform visualization.

#### Installation

```bash
npx ai-elements@latest add speech-input
```

#### Basic Usage

```tsx
import { SpeechInput } from "@/components/ai-elements/speech-input";

<SpeechInput 
  onRecordingComplete={(blob) => {
    // Handle audio blob
    console.log("Audio recorded:", blob);
  }}
/>
```

---

### Mic Selector

Select microphone input device.

#### Installation

```bash
npx ai-elements@latest add mic-selector
```

#### Basic Usage

```tsx
import {
  MicSelector,
  MicSelectorTrigger,
  MicSelectorContent,
  MicSelectorItem,
} from "@/components/ai-elements/mic-selector";

<MicSelector value={deviceId} onValueChange={setDeviceId}>
  <MicSelectorTrigger />
  <MicSelectorContent>
    {devices.map((device) => (
      <MicSelectorItem key={device.deviceId} value={device.deviceId}>
        {device.label}
      </MicSelectorItem>
    ))}
  </MicSelectorContent>
</MicSelector>
```

#### Hook

```tsx
import { useAudioDevices } from "@/components/ai-elements/mic-selector";

const { devices, loading, error, hasPermission, loadDevices } = useAudioDevices();
```

---

### Voice Selector

Select text-to-speech voice.

#### Installation

```bash
npx ai-elements@latest add voice-selector
```

#### Basic Usage

```tsx
import {
  VoiceSelector,
  VoiceSelectorTrigger,
  VoiceSelectorContent,
  VoiceSelectorVoice,
} from "@/components/ai-elements/voice-selector";

<VoiceSelector value={voiceId} onValueChange={setVoiceId}>
  <VoiceSelectorTrigger />
  <VoiceSelectorContent>
    {voices.map((voice) => (
      <VoiceSelectorVoice 
        key={voice.id} 
        value={voice.id}
        name={voice.name}
        description={voice.description}
        preview={voice.previewUrl}
      />
    ))}
  </VoiceSelectorContent>
</VoiceSelector>
```

---

### Transcription

Display transcribed audio with timing and seeking.

#### Installation

```bash
npx ai-elements@latest add transcription
```

#### Basic Usage

```tsx
import {
  Transcription,
  TranscriptionSegment,
} from "@/components/ai-elements/transcription";

<Transcription 
  segments={segments}
  currentTime={currentTime}
  onSeek={handleSeek}
>
  {(segment, index) => (
    <TranscriptionSegment key={index} segment={segment} />
  )}
</Transcription>
```

---

## Code Components

### Code Block

Syntax-highlighted code blocks with copy functionality.

#### Installation

```bash
npx ai-elements@latest add code-block
```

#### Basic Usage

```tsx
import { CodeBlock } from "@/components/ai-elements/code-block";

<CodeBlock 
  lang="typescript" 
  filename="example.ts"
  code={`const greeting = "Hello, world!";`}
/>
```

#### With Markdown

```tsx
import { CodeBlockContent } from "@/components/ai-elements/code-block";

<CodeBlockContent>
  {`\`\`\`typescript
function hello() {
  console.log("Hello!");
}
\`\`\``}
</CodeBlockContent>
```

---

### Terminal

Display terminal output with ANSI color support.

#### Installation

```bash
npx ai-elements@latest add terminal
```

#### Basic Usage

```tsx
import { Terminal, TerminalContent } from "@/components/ai-elements/terminal";

<Terminal output="npm install complete" />

// With streaming
<Terminal 
  output={streamingOutput}
  streaming={true}
/>
```

#### Features

- Full ANSI color support (256 colors, bold, italic, underline)
- Streaming mode with cursor animation
- Auto-scroll to latest output
- Copy output to clipboard
- Clear button support

---

### Agent

Display AI agent configuration with tools and instructions.

#### Installation

```bash
npx ai-elements@latest add agent
```

#### Basic Usage

```tsx
import {
  Agent,
  AgentHeader,
  AgentContent,
  AgentInstructions,
  AgentTools,
  AgentTool,
  AgentOutput,
} from "@/components/ai-elements/agent";

<Agent>
  <AgentHeader model="gpt-4o" name="Research Assistant" />
  <AgentContent>
    <AgentInstructions>
      You are a helpful research assistant...
    </AgentInstructions>
    <AgentTools type="multiple">
      <AgentTool tool={webSearchTool} value="web_search" />
      <AgentTool tool={readUrlTool} value="read_url" />
    </AgentTools>
    <AgentOutput schema={outputSchema} />
  </AgentContent>
</Agent>
```

---

### Tool

Display tool call information with streaming support.

#### Installation

```bash
npx ai-elements@latest add tool
```

#### Basic Usage

```tsx
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

<Tool>
  <ToolHeader 
    state="input-streaming"
    title="web_search"
    type="tool-web_search"
  />
  <ToolContent>
    <ToolInput input={{ query: "React hooks" }} />
    <ToolOutput output={result} />
  </ToolContent>
</Tool>
```

#### States

- `input-streaming`: Receiving input parameters
- `input-available`: Input ready
- `output-streaming`: Generating output
- `output-available`: Output complete
- `error`: Tool execution failed

---

### Plan

Display AI planning with expandable sections.

#### Installation

```bash
npx ai-elements@latest add plan
```

#### Basic Usage

```tsx
import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanAction,
} from "@/components/ai-elements/plan";

<Plan isStreaming={isStreaming}>
  <PlanHeader>
    <PlanTitle>Implementation Plan</PlanTitle>
    <PlanDescription>Steps to complete the task</PlanDescription>
    <PlanAction>
      <Button>Expand</Button>
    </PlanAction>
  </PlanHeader>
  <PlanContent>
    Detailed plan steps here...
  </PlanContent>
</Plan>
```

---

### Queue

Display task queue with sections and status.

#### Installation

```bash
npx ai-elements@latest add queue
```

#### Basic Usage

```tsx
import {
  Queue,
  QueueItem,
  QueueItemTitle,
  QueueItemDescription,
  QueueItemStatus,
  QueueItemActions,
  QueueItemAction,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionContent,
} from "@/components/ai-elements/queue";

<Queue>
  <QueueSection>
    <QueueSectionTrigger>Active Tasks (2)</QueueSectionTrigger>
    <QueueSectionContent>
      <QueueItem>
        <QueueItemTitle>Task 1</QueueItemTitle>
        <QueueItemDescription>Description</QueueItemDescription>
        <QueueItemStatus status="active" />
        <QueueItemActions>
          <QueueItemAction onClick={handlePause}>Pause</QueueItemAction>
        </QueueItemActions>
      </QueueItem>
    </QueueSectionContent>
  </QueueSection>
</Queue>
```

---

### File Tree

Display hierarchical file structure.

#### Installation

```bash
npx ai-elements@latest add file-tree
```

#### Basic Usage

```tsx
import {
  FileTree,
  FileTreeFolder,
  FileTreeFile,
} from "@/components/ai-elements/file-tree";

<FileTree 
  selectedPath={selectedPath}
  onSelect={setSelectedPath}
  defaultExpanded={new Set(["src", "src/components"])}
>
  <FileTreeFolder name="src" path="src">
    <FileTreeFolder name="components" path="src/components">
      <FileTreeFile name="button.tsx" path="src/components/button.tsx" />
      <FileTreeFile name="input.tsx" path="src/components/input.tsx" />
    </FileTreeFolder>
    <FileTreeFile name="app.tsx" path="src/app.tsx" />
  </FileTreeFolder>
  <FileTreeFile name="package.json" path="package.json" />
</FileTree>
```

---

### Task

Display individual task with file references.

#### Installation

```bash
npx ai-elements@latest add task
```

#### Basic Usage

```tsx
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from "@/components/ai-elements/task";

<Task>
  <TaskTrigger>Build Component</TaskTrigger>
  <TaskContent>
    <TaskItem>Search components</TaskItem>
    <TaskItem>
      Read <TaskItemFile>components/button.tsx</TaskItemFile>
    </TaskItem>
  </TaskContent>
</Task>
```

---

### Checkpoint

Allow users to save and restore conversation states.

#### Installation

```bash
npx ai-elements@latest add checkpoint
```

#### Basic Usage

```tsx
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ai-elements/checkpoint";

<Checkpoint>
  <CheckpointIcon />
  <CheckpointTrigger onClick={handleRestore}>
    Restore checkpoint
  </CheckpointTrigger>
</Checkpoint>
```

---

## Utilities

### Context

Display token usage and context window information.

#### Installation

```bash
npx ai-elements@latest add context
```

#### Basic Usage

```tsx
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextUsage,
  ContextChart,
} from "@/components/ai-elements/context";

<Context 
  model="gpt-4o"
  usage={{
    promptTokens: 1500,
    completionTokens: 500,
    totalTokens: 2000,
  }}
>
  <ContextTrigger />
  <ContextContent>
    <ContextUsage />
    <ContextChart />
  </ContextContent>
</Context>
```

---

### Open in Chat

Provide links to open queries in various AI chat platforms.

#### Installation

```bash
npx ai-elements@latest add open-in-chat  
```

#### Basic Usage

```tsx
import {
  OpenIn,
  OpenInTrigger,
  OpenInContent,
  OpenInChatGPT,
  OpenInClaude,
  OpenInCursor,
} from "@/components/ai-elements/open-in-chat";

const query = "How do I use React hooks?";

<OpenIn>
  <OpenInTrigger />
  <OpenInContent>
    <OpenInChatGPT query={query} />
    <OpenInClaude query={query} />
    <OpenInCursor query={query} />
  </OpenInContent>
</OpenIn>
```

#### Supported Platforms

- ChatGPT
- Claude
- Cursor
- T3 Chat
- Scira AI
- v0

---

### Chain of Thought

Display AI's step-by-step reasoning process.

#### Installation

```bash
npx ai-elements@latest add chain-of-thought
```

#### Basic Usage

```tsx
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtImage,
} from "@/components/ai-elements/chain-of-thought";

<ChainOfThought>
  <ChainOfThoughtHeader />
  <ChainOfThoughtContent>
    <ChainOfThoughtStep icon={SearchIcon} label="Searching">
      Looking for relevant information...
    </ChainOfThoughtStep>
    
    <ChainOfThoughtSearchResults>
      <ChainOfThoughtSearchResult 
        title="Result 1"
        snippet="Preview text..."
        url="https://example.com"
      />
    </ChainOfThoughtSearchResults>
    
    <ChainOfThoughtStep icon={BrainIcon} label="Analyzing">
      Processing the search results...
    </ChainOfThoughtStep>
    
    <ChainOfThoughtImage caption="Generated diagram">
      <img src="/diagram.png" alt="Diagram" />
    </ChainOfThoughtImage>
  </ChainOfThoughtContent>
</ChainOfThought>
```

---

## Hooks and Context

### usePromptInputAttachments

Manage file attachments in prompt input.

```tsx
const {
  files,              // Array of attached files
  add,                // Add files
  remove,             // Remove file by ID
  clear,              // Clear all files
  openFileDialog,     // Open file picker
  fileInputRef        // Ref to file input
} = usePromptInputAttachments();
```

### usePromptInputController

Access prompt input state (requires PromptInputProvider).

```tsx
const {
  textInput: {
    value,
    setInput,
    clear
  },
  attachments         // Same as usePromptInputAttachments
} = usePromptInputController();
```

### useReasoning

Access reasoning component state.

```tsx
const {
  isStreaming,        // Whether reasoning is streaming
  isOpen,             // Whether panel is open
  setIsOpen,          // Set open state
  duration            // Duration in seconds (undefined while streaming)
} = useReasoning();
```

### useChainOfThought

Access chain of thought state.

```tsx
const {
  isOpen,
  setIsOpen
} = useChainOfThought();
```

---

## Advanced Usage

### Integration with AI SDK

AI Elements work seamlessly with Vercel's AI SDK:

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

export default function Chat() {
  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="flex h-screen flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                <MessageResponse>{message.content}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit}>
        <PromptInputBody>
          <PromptInputTextarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
          />
        </PromptInputBody>
        <PromptInputSubmit disabled={isLoading} />
      </PromptInput>
    </div>
  );
}
```

### Theming

AI Elements use CSS variables for theming. Customize in your `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  /* ... and more */
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... dark theme values */
}
```

### Custom Styling

All components accept `className` prop for custom styles:

```tsx
<Message className="border-l-4 border-blue-500">
  {/* ... */}
</Message>

<PromptInput className="rounded-3xl shadow-lg">
  {/* ... */}
</PromptInput>
```

### Accessibility

Components are built with accessibility in mind:

- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- Focus management
- High contrast mode support

---

## Resources

- **Documentation**: https://elements.ai-sdk.dev
- **GitHub**: https://github.com/vercel/ai-elements
- **shadcn/ui**: https://ui.shadcn.com
- **AI SDK**: https://ai-sdk.dev

## Contributing

AI Elements is open source. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See the [contribution guidelines](https://github.com/vercel/ai-elements/blob/main/CONTRIBUTING.md) for more details.

---

**Last Updated**: February 2026
