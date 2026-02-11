import { Hono } from 'hono';
import { streamText, tool } from 'ai';
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
  try {
    const { messages, sessionId = 'default' } = await c.req.json();

    // Get or initialize conversation history
    const conversationHistory = conversationStore.get(sessionId) || [];
    conversationHistory.push(...messages);
    conversationStore.set(sessionId, conversationHistory);

    const result = streamText({
      model: gateway('anthropic/claude-sonnet-4.5'),
      messages: conversationHistory,
      tools: {
        scanNetwork: tool({
          description: 'Scan a network for vulnerabilities and open ports',
          inputSchema: z.object({
            target: z.string().describe('The target IP address or domain to scan'),
            scanType: z.enum(['quick', 'full', 'stealth']).describe('Type of scan to perform'),
          }),
          execute: async ({ target, scanType }) => {
            // Simulate network scan (integrate with your actual scanning modules)
            return {
              target,
              scanType,
              openPorts: [22, 80, 443, 8080],
              vulnerabilities: [
                { severity: 'high', description: 'Outdated SSH version detected' },
                { severity: 'medium', description: 'Weak SSL/TLS configuration' },
              ],
              status: 'completed',
            };
          },
        }),
        searchSubdomains: tool({
          description: 'Search for subdomains of a given domain',
          inputSchema: z.object({
            domain: z.string().describe('The domain to search subdomains for'),
          }),
          execute: async ({ domain }) => {
            // Simulate subdomain search (integrate with your subdomain module)
            return {
              domain,
              subdomains: [
                `www.${domain}`,
                `api.${domain}`,
                `mail.${domain}`,
                `dev.${domain}`,
              ],
              count: 4,
            };
          },
        }),
        bruteForce: tool({
          description: 'Perform a brute force attack simulation (for authorized testing only)',
          inputSchema: z.object({
            target: z.string().describe('The target service to test'),
            username: z.string().describe('Username to test'),
          }),
          execute: async ({ target, username }) => {
            // Simulate brute force (integrate with your brute force module)
            return {
              target,
              username,
              status: 'Testing in progress',
              warning: 'Only use on authorized systems',
            };
          },
        }),
        directorySearch: tool({
          description: 'Search for hidden directories on a web server',
          inputSchema: z.object({
            url: z.string().describe('The base URL to search'),
          }),
          execute: async ({ url }) => {
            // Simulate directory search (integrate with your directory-search module)
            return {
              url,
              foundDirectories: [
                '/admin',
                '/backup',
                '/config',
                '/.git',
              ],
              status: 'completed',
            };
          },
        }),
      },
      maxSteps: 5,
    });

    // Set up SSE headers for streaming
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          for await (const delta of result.textStream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: delta })}\n\n`));
          }
          
          // Send tool calls and results if any
          const toolCalls = await result.toolCalls;
          const toolResults = await result.toolResults;
          
          if (toolCalls.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'toolCalls', content: toolCalls })}\n\n`));
          }
          
          if (toolResults.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'toolResults', content: toolResults })}\n\n`));
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: String(error) })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Clear conversation history
app.delete('/api/chat/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  conversationStore.delete(sessionId);
  return c.json({ success: true, message: 'Conversation cleared' });
});

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
