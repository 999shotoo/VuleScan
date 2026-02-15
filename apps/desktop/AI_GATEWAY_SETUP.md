# AI Gateway Setup Guide

## Overview

VuleScan now uses **Vercel AI Gateway** to access 100+ AI models from multiple providers through a single unified API. This simplifies configuration and gives you access to:

- **OpenAI**: GPT-5.2, GPT-5, GPT-4o, O3, O1, and more
- **Anthropic**: Claude Opus 4.6, Claude Sonnet 4.5, Claude Haiku 4.5
- **Google**: Gemini 3, Gemini 2.5, Gemini 2.0
- **xAI**: Grok 4.1, Grok 4, Grok 3
- **Meta**: Llama 3.3, Llama 3.2, Llama 3.1
- **DeepSeek**: DeepSeek v3.2, DeepSeek R1
- **Mistral**: Mistral Large 3, Codestral, Pixtral
- **Alibaba**: Qwen3 models
- **And many more**

## Setup

### 1. Get Your AI Gateway API Key

Your AI Gateway API key is already configured in `.env`:

```env
AI_GATEWAY_API_KEY=vck_2BrOrde6uGOVeqrZdFqcufwBZYrUg6k2py31kG14YvDvaK1MsT0kAbYm
```

If you need a new key:
1. Visit [Vercel AI SDK Gateway](https://sdk.vercel.ai/gateway)
2. Create an account or sign in
3. Generate a new API key
4. Replace the value in `.env`

### 2. No Additional API Keys Needed

Unlike the previous setup, you **don't need individual API keys** from OpenAI, Anthropic, or Google. The AI Gateway handles authentication and routing automatically.

### 3. Model Selection

The chat interface now includes 100+ models. Select any model from the dropdown:

```typescript
// Example: Using GPT-5.2
model: "openai/gpt-5.2"

// Example: Using Claude Opus 4.6
model: "anthropic/claude-opus-4.6"

// Example: Using Gemini 2.5 Flash
model: "google/gemini-2.5-flash"
```

## Architecture

### API Server (electron/server/api.ts)

The API server uses AI Gateway automatically when model IDs are in `provider/model-name` format:

```typescript
import { streamText } from 'ai';

// AI Gateway is automatically used - no setup needed!
const result = streamText({
  model: 'openai/gpt-5.2', // Format: provider/model-name
  messages: formattedMessages,
  temperature: 0.7,
});
```

The AI SDK automatically detects the format and routes through AI Gateway. Your `AI_GATEWAY_API_KEY` environment variable is automatically picked up.

### Frontend (src/pages/chat/mainchat.tsx)

Models are organized by provider:

```typescript
const models = [
  { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "OpenAI" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "Anthropic" },
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash", provider: "Google" },
  // ... 100+ more models
];
```

## Features

### All Features Available

- ✅ **File Upload**: Upload images, PDFs, and documents
- ✅ **Web Search**: Enable web search for current information (mock implementation, needs real API)
- ✅ **Model Switching**: Switch between models mid-conversation
- ✅ **Chat History**: Automatic persistence with localStorage
- ✅ **Error Handling**: Retry failed requests
- ✅ **Streaming**: Real-time response streaming

### Model Capabilities

Different models have different strengths:

| Model | Best For | Context | Speed |
|-------|----------|---------|-------|
| GPT-5.2 | General tasks, coding | 1000K | Fast |
| GPT-4o | Vision, images | 400K | Fast |
| Claude Opus 4.6 | Complex reasoning | 262K | Slow |
| Claude Sonnet 4.5 | Balanced performance | 1000K | Medium |
| Gemini 2.5 Pro | Long context | 2000K | Fast |
| DeepSeek v3.2 | Math, science | 1000K | Fast |
| Grok 4 | Current events | 400K | Fast |

## Migration from Old Setup

### What Changed

**Before**: Required 3 separate API keys (OpenAI, Anthropic, Google)
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

**After**: Single AI Gateway key
```env
AI_GATEWAY_API_KEY=vck_...
```

### Removed Dependencies

The AI Gateway is built into the AI SDK, so you only need:

```bash
# Already installed
npm install ai @ai-sdk/openai
```

No additional provider packages needed! The `@ai-sdk/openai` package is used for compatibility, but you can access all providers through the gateway.

### Updated Files

1. **Uses model strings in `provider/model-name` format
   - AI Gateway automatically handles routing
   - No provider-specific imports needed

2. **src/pages/chat/mainchat.tsx**
   - Replaced 11 models with 100+ models
   - Model IDs include provider prefix
   - Fixed duplicate key warnings

3. **.env**
   - Single `AI_GATEWAY_API_KEY` variable
   - Automatically picked up by AI SDK
   - Removed individual provider keys

## Troubleshooting

### "Unauthorized" Error

**Problem**: API returns 401 or 403
**Solution**: Check that `AI_GATEWAY_API_KEY` is correct in `.env`

### Model Not Found

**Problem**: Error says model doesn't exist
**Solution**: Verify the model ID format: `provider/model-name`

Example:
- ✅ `openai/gpt-4o`
- ❌ `gpt-4o` (missing provider prefix)

### Slow Response

**Problem**: Model takes too long to respond
**Solution**: Try a faster model:
- Use `google/gemini-2.0-flash` instead of `google/gemini-2.5-pro`
- Use `openai/gpt-4o-mini` instead of `openai/gpt-5.2`
- Use `anthropic/claude-haiku-4.5` instead of `anthropic/claude-opus-4.6`

### Rate Limiting

**Problem**: "Too many requests" error
**Solution**: 
1. Wait a few seconds between requests
2. Consider upgrading your AI Gateway plan
3. Use lower-tier models for testing

## Advanced Configuration

### Custom Provider Options

You can control routing behavior using provider options:

```typescript
import type { GatewayLanguageModelOptions } from '@ai-sdk/gateway';
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4',
  prompt: 'Explain quantum computing',
  providerOptions: {
    gateway: {
      order: ['vertex', 'anthropic'], // Try Vertex AI first
      only: ['vertex', 'anthropic'], // Restrict to these providers
    } satisfies GatewayLanguageModelOptions,
  },
});
```

### Cost Optimization

Each model has different pricing. Check the model dropdown for costs:
- **Cheapest**: `openai/gpt-4o-mini` ($0.05/M tokens)
- **Best Value**: `google/gemini-2.0-flash` ($0.10/M input)
- **Most Capable**: `anthropic/claude-opus-4.6` ($0.50/M input)

## Resources

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [AI Gateway Documentation](https://sdk.vercel.ai/gateway)
- [Model Pricing](https://sdk.vercel.ai/providers)
- [Supported Models List](https://sdk.vercel.ai/providers/ai-sdk-providers)

## Support

If you encounter issues:

1. Check console logs in DevTools (F12)
2. Verify `.env` configuration
3. Test with a simple model like `openai/gpt-4o-mini`
4. Review error messages in the chat UI

## Next Steps

1. **Test Different Models**: Try various models to find what works best
2. **Implement Web Search**: Add real web search API integration
3. **Monitor Usage**: Track token usage and costs
4. **Optimize Performance**: Use appropriate models for each task

---

**Note**: The AI Gateway provides access to models but doesn't automatically grant you access to all of them. Some models may require additional permissions or may not be available in your region.
