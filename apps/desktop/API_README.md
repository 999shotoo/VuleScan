# VuleScan Desktop - AI Chat API

This desktop application includes a built-in Hono.js API server with Vercel AI SDK integration for AI-powered security chat.

## Features

- 🤖 AI-powered security assistant using Vercel AI Gateway
- 🔧 Built-in tools for security scanning:
  - Network vulnerability scanning
  - Subdomain discovery
  - Brute force testing (authorized only)
  - Directory enumeration
- 🌊 Streaming responses for real-time interaction
- 💾 Session-based conversation history

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your Vercel AI Gateway API key:

```env
AI_GATEWAY_API_KEY=your_actual_api_key_here
API_PORT=3000
```

**Get your API key:**
1. Visit [Vercel AI Gateway](https://vercel.com/ai-gateway)
2. Sign up or log in
3. Create an API key
4. Copy it to your `.env` file

### 3. Run the Application

```bash
npm run dev
```

The API server will start automatically on port 3000 when the Electron app launches.

## API Endpoints

### POST `/api/chat`

Send a chat message and receive streaming responses.

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Scan 192.168.1.1 for vulnerabilities"
    }
  ],
  "sessionId": "default"
}
```

**Response:** Server-Sent Events (SSE) stream

```
data: {"type":"text","content":"I'll scan that IP for you..."}
data: {"type":"toolCalls","content":[...]}
data: {"type":"toolResults","content":[...]}
data: [DONE]
```

### DELETE `/api/chat/:sessionId`

Clear conversation history for a session.

**Response:**
```json
{
  "success": true,
  "message": "Conversation cleared"
}
```

### GET `/api/health`

Check API server health.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T12:00:00.000Z"
}
```

## Available AI Tools

The AI assistant has access to these security tools:

### 1. scanNetwork
Scan a network for vulnerabilities and open ports.

**Parameters:**
- `target` (string): IP address or domain
- `scanType` (enum): 'quick' | 'full' | 'stealth'

### 2. searchSubdomains
Discover subdomains for a given domain.

**Parameters:**
- `domain` (string): Domain to search

### 3. bruteForce
Simulate brute force attacks (authorized testing only).

**Parameters:**
- `target` (string): Target service
- `username` (string): Username to test

### 4. directorySearch
Find hidden directories on web servers.

**Parameters:**
- `url` (string): Base URL to search

## Using the API in React Components

### Example: Chat Interface

```tsx
import { sendChatMessage, ChatMessage } from '@/lib/api-client';

const [messages, setMessages] = useState<ChatMessage[]>([]);

const handleSend = async (userInput: string) => {
  const userMessage: ChatMessage = {
    role: 'user',
    content: userInput,
  };

  let fullResponse = '';

  await sendChatMessage([userMessage], 'default', (response) => {
    if (response.type === 'text') {
      fullResponse += response.content;
      // Update UI with streaming text
    }
  });

  setMessages([
    ...messages,
    userMessage,
    { role: 'assistant', content: fullResponse },
  ]);
};
```

### Pre-built Component

Use the `ChatInterface` component for a ready-made chat UI:

```tsx
import { ChatInterface } from '@/components/chat-interface';

function App() {
  return <ChatInterface />;
}
```

## Architecture

```
apps/desktop/
├── electron/
│   ├── main.ts              # Electron main process
│   └── server/
│       ├── index.ts         # Server starter
│       └── api.ts           # Hono routes & AI logic
├── src/
│   ├── lib/
│   │   └── api-client.ts    # API client utilities
│   └── components/
│       └── chat-interface.tsx  # Chat UI component
└── .env                     # Environment variables
```

## Development

The API server runs inside the Electron main process and starts automatically when the app launches. It's accessible at `http://localhost:3000` (or your configured port).

**Hot Reload:** Changes to the server code require restarting the Electron app.

## Security Notes

⚠️ **Important:**
- Only use scanning tools on authorized systems
- Keep your API key secure and never commit it to version control
- The `.env` file is already in `.gitignore`
- Consider rate limiting for production use

## Troubleshooting

### API Server Not Starting

Check that:
1. Port 3000 is not already in use
2. Environment variables are loaded correctly
3. All dependencies are installed

### AI Not Responding

Verify:
1. Your `AI_GATEWAY_API_KEY` is set correctly
2. You have internet connectivity
3. Check the Electron console for errors

## Integrating Real Scanning Modules

Replace the simulated tool executions in `electron/server/api.ts` with your actual modules:

```typescript
import { scanNetwork } from '../../modules/Network scan/src/network-scan';
import { findSubdomains } from '../../modules/subdomain/subdomain-finder';

// Then use them in the tool execute functions
execute: async ({ target }) => {
  return await scanNetwork(target);
}
```

## License

See the main project LICENSE file.
