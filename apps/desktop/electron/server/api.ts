import { Hono } from 'hono';
import { createUIMessageStream, createUIMessageStreamResponse, streamText, convertToModelMessages, UIMessage } from 'ai';
import { cors } from 'hono/cors';

const app = new Hono();

// Enable CORS for local development
app.use('/*', cors());

// Chat endpoint with streaming
app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json();
    const { messages, model: modelId = 'openai/gpt-4o' }: { messages: UIMessage[], model?: string } = body;

    console.log('\n========== NEW CHAT REQUEST ==========');
    console.log('Received messages:', messages.length);
    console.log('Model:', modelId);
    console.log('Last message:', JSON.stringify(messages[messages.length - 1], null, 2));

    // Convert UI messages to model messages - this handles all part types including files automatically
    const modelMessages = await convertToModelMessages(messages);
    
    console.log('Converted to model messages:', JSON.stringify(modelMessages, null, 2));

    // Create UI message stream
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Send stream start event
        writer.write({ type: 'start' });

        // Send custom metadata (optional)
        writer.write({
          type: 'data-custom',
          data: {
            model: modelId,
            timestamp: new Date().toISOString(),
          },
        });

        // Stream response - AI Gateway automatically used when model is in 'provider/model-name' format
        const result = streamText({
          model: modelId, // e.g., 'openai/gpt-4o', 'anthropic/claude-sonnet-4'
          messages: modelMessages,
          temperature: 0.7,
        });

        // Merge AI stream into UI message stream
        writer.merge(
          result.toUIMessageStream({
            sendStart: false, // We already sent start event above
            onError: (error) => {
              // Expose error message to client for better debugging
              return error instanceof Error ? error.message : String(error);
            },
          }),
        );
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('Chat API error:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
