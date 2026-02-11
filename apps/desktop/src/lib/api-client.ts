// API client for communicating with the Hono backend

const API_BASE_URL = 'http://localhost:3000/api';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  type: 'text' | 'toolCalls' | 'toolResults' | 'error';
  content: any;
}

/**
 * Send a chat message and receive streaming responses
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  sessionId: string = 'default',
  onChunk: (response: ChatResponse) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, sessionId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            onChunk(parsed);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    onChunk({ type: 'error', content: String(error) });
  }
}

/**
 * Clear conversation history for a session
 */
export async function clearConversation(sessionId: string = 'default'): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Clear conversation error:', error);
    throw error;
  }
}

/**
 * Check API health status
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}
