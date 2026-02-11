import { Hono } from 'hono';
import { createUIMessageStream, createUIMessageStreamResponse, streamText, tool } from 'ai';
import { gateway } from 'ai';
import { z } from 'zod';
import { cors } from 'hono/cors';

const app = new Hono();

// Enable CORS for local development
app.use('/*', cors());

// Store conversation messages per session
const conversationStore = new Map<string, any[]>();

// Chat endpoint with streaming
app.post('/api/chat', async (c) => {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'start' });

      writer.write({
        type: 'data-custom',
        data: {
          custom: 'Hello, world!',
        },
      });

      const result = streamText({
        model: 'google/gemini-2.5-flash-lite',
        prompt: "Tell me a joke about computers.",
      });

      writer.merge(
        result.toUIMessageStream({
          sendStart: false,
          onError: error => {
            // Error messages are masked by default for security reasons.
            // If you want to expose the error message to the client, you can do so here:
            return error instanceof Error ? error.message : String(error);
          },
        }),
      );
    },
  });
  return createUIMessageStreamResponse({ stream });
});

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
