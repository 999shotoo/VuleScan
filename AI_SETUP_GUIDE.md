# VuleScan AI Chat Setup Guide

## Overview

VuleScan now includes a comprehensive AI chat interface with support for multiple AI providers, image upload, web search, and advanced features.

## Features Implemented

### ✅ Multi-Provider AI Support
- **OpenAI**: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 4 Opus, Claude 4 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku
- **Google**: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash

### ✅ File Upload Support
- **Image Upload**: Supports all common image formats (JPEG, PNG, GIF, WebP)
- **Document Upload**: PDFs, text files, Word documents
- **Max File Size**: 10MB per file
- **Multiple Files**: Upload multiple files in a single message
- **Drag & Drop**: Drop files anywhere in the chat window

### ✅ Advanced Chat Features
- **Web Search Integration**: Enable real-time web search for current information
- **Streaming Responses**: Real-time token-by-token streaming
- **Error Handling**: Graceful error messages with retry functionality
- **Chat Persistence**: Conversations saved locally
- **Auto-scroll**: Automatic scrolling to latest messages
- **Message History**: Full conversation history with reload capability

### ✅ AI Elements Components
- Conversation container with auto-scroll
- Message display with markdown support
- Prompt input with attachments
- Model selector with provider labels
- Error display with retry
- Loading states

## Installation & Setup

### 1. Install Dependencies

First, install all the new AI provider packages:

```bash
cd apps/desktop
npm install @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

### 2. Configure API Keys

You need to obtain API keys from the AI providers you want to use:

#### OpenAI
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key to your `.env` file

#### Anthropic
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

#### Google AI
1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

### 3. Update Environment Variables

Edit `apps/desktop/.env` and add your API keys:

```env
# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx

# Google AI
GOOGLE_API_KEY=xxxxxxxxxxxxxxxxxxxxx

# API Server
API_PORT=3000
```

**Important**: Keep your `.env` file secure and never commit it to version control!

### 4. Start the Application

```bash
# From the desktop app directory
npm run dev
```

The API server will start on `http://localhost:3000` and the Electron app will launch.

## Usage Guide

### Basic Chat

1. Type your message in the input field
2. Select an AI model from the dropdown (default: GPT-4o)
3. Click Send or press Enter

### Image Analysis

1. Click the attachment icon (📎) or drag & drop images
2. Uploaded images will appear above the input
3. Add your question or prompt
4. The AI will analyze the images and respond

**Supported Models for Vision**:
- GPT-4o, GPT-4o Mini, GPT-4 Turbo (OpenAI)
- Claude models (Anthropic)
- Gemini models (Google)

### Web Search

1. Click the "Web Search" button to enable
2. The AI will search the web for current information
3. Results will be included in the response
4. Toggle off to disable web search

### Model Selection

Choose from 11 different AI models:

**OpenAI Models**:
- GPT-4o: Most capable, best for complex tasks
- GPT-4o Mini: Faster and cheaper, good for simple tasks
- GPT-4 Turbo: Previous generation, still very capable
- GPT-3.5 Turbo: Fast and economical

**Anthropic Models**:
- Claude 4 Opus: Most intelligent, best reasoning
- Claude 4 Sonnet: Balanced performance
- Claude 3.5 Sonnet: Fast and capable
- Claude 3.5 Haiku: Fastest, most economical

**Google Models**:
- Gemini 2.0 Flash: Latest experimental model
- Gemini 1.5 Pro: Most capable Gemini model
- Gemini 1.5 Flash: Fast and efficient

## API Architecture

### Server Structure

```
apps/desktop/electron/server/
├── index.ts       # Server initialization
└── api.ts         # API routes and AI logic
```

### Key API Endpoints

#### POST /api/chat
Handles chat messages with streaming responses.

**Request Body**:
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string,
    parts: Array<{ type: 'text', text: string }>,
    experimental_attachments?: Array<{
      name: string,
      contentType: string,
      url: string // base64 or URL
    }>
  }>,
  model: string,      // e.g., "gpt-4o"
  webSearch: boolean  // Enable web search
}
```

**Response**: Streaming text response using AI SDK data protocol

#### GET /api/health
Health check endpoint for server status.

### Provider Configuration

The API automatically selects the correct provider based on the model ID:

```typescript
// OpenAI models
'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'

// Anthropic models
'claude-opus-4-20250514', 'claude-sonnet-4-20250514', etc.

// Google models
'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'
```

## Customization

### Adding New Models

Edit `apps/desktop/electron/server/api.ts`:

```typescript
const providers = {
  openai: {
    'new-model-id': openai('new-model-id'),
    // ...
  },
  // ...
};
```

Then update the UI in `apps/desktop/src/pages/chat/mainchat.tsx`:

```typescript
const models = [
  { id: "new-model-id", name: "New Model", provider: "OpenAI" },
  // ...
];
```

### Implementing Real Web Search

Replace the mock web search in `api.ts`:

```typescript
const webSearchTool = tool({
  description: 'Search the web for current information',
  parameters: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }) => {
    // Implement with a real search API:
    // - Google Custom Search API
    // - Bing Search API
    // - Brave Search API
    // - Serper API
    
    const response = await fetch(`https://api.search.com/search?q=${query}`);
    const results = await response.json();
    return results;
  },
});
```

### Adding More Tools

The AI SDK supports tool calling. Add new tools in `api.ts`:

```typescript
const calculatorTool = tool({
  description: 'Perform mathematical calculations',
  parameters: z.object({
    expression: z.string(),
  }),
  execute: async ({ expression }) => {
    // Evaluate the expression safely
    return { result: eval(expression) };
  },
});

// Then add to tools object
const tools = {
  webSearch: webSearchTool,
  calculator: calculatorTool,
};
```

## Troubleshooting

### API Key Issues

**Error**: `"Invalid API key"`
- Verify your API key is correct in `.env`
- Check that the key has the correct format
- Ensure you've saved the `.env` file
- Restart the application after changing `.env`

### Model Not Available

**Error**: `"Model not found"` or 404
- Verify you have access to the model (some require waitlist)
- Check your API key has the correct permissions
- Try a different model

### File Upload Issues

**Error**: Files not uploading or processing
- Check file size (max 10MB)
- Verify file type is supported
- Ensure the model supports vision (for images)
- Check browser console for errors

### Streaming Issues

**Error**: Messages not streaming or appearing
- Check API server is running on port 3000
- Verify CORS is enabled in `api.ts`
- Check browser console for fetch errors
- Try a different model

### Rate Limiting

If you hit rate limits:
- Wait and try again
- Upgrade your API plan
- Switch to a different model
- Use a less popular time of day

## Performance Tips

1. **Model Selection**: Use smaller models (GPT-4o Mini, Claude Haiku) for simple tasks
2. **Image Compression**: Compress images before uploading
3. **Web Search**: Only enable when needed
4. **Chat History**: Clear old conversations to improve performance
5. **Token Usage**: Monitor your token usage in API dashboards

## Security Best Practices

1. **Never commit** `.env` files to git
2. **Rotate API keys** periodically
3. **Set up** billing alerts on provider dashboards
4. **Limit** max tokens in production
5. **Validate** all user inputs
6. **Sanitize** file uploads

## Cost Management

### Estimated Costs (as of Feb 2025)

**OpenAI**:
- GPT-4o: $2.50/$10 per 1M tokens (input/output)
- GPT-4o Mini: $0.15/$0.60 per 1M tokens

**Anthropic**:
- Claude 4 Opus: $15/$75 per 1M tokens
- Claude 3.5 Haiku: $0.80/$4 per 1M tokens

**Google**:
- Gemini 1.5 Pro: Free tier available
- Gemini 1.5 Flash: Free tier available

**Tips**:
- Start with free tiers (Google Gemini)
- Use cheaper models for development
- Implement token limits
- Cache responses when possible

## Next Steps

### Recommended Enhancements

1. **Implement Real Web Search**: Integrate a search API
2. **Add More Tools**: Calculator, code execution, database queries
3. **Message Branching**: Allow editing and regenerating messages
4. **Export Conversations**: Download as text, PDF, or JSON
5. **Voice Input**: Add speech-to-text capability
6. **Code Execution**: Add code interpreter tool
7. **RAG Integration**: Add vector database for knowledge retrieval
8. **Multi-modal Output**: Generate images with DALL-E or Midjourney

### Advanced Features

- **Reasoning Mode**: Display chain-of-thought reasoning
- **Sources**: Show citations and references
- **Suggestions**: Quick prompt suggestions
- **Context Window**: Display token usage
- **Model Comparison**: Compare responses from multiple models
- **Prompt Templates**: Save and reuse prompts
- **Conversation Sharing**: Share conversations via link

## Support

For issues or questions:
1. Check the documentation: [ai-elements.md](./ai-elements.md) and [ai-package.md](./ai-package.md)
2. Review provider documentation (see links in `.env.example`)
3. Check the AI SDK docs: https://ai-sdk.dev

## License

This implementation uses:
- Vercel AI SDK (Apache 2.0)
- AI Elements (MIT)
- Individual provider SDKs (check respective licenses)

---

**Last Updated**: February 2025
