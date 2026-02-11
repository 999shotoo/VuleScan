import { UIMessage } from '@ai-sdk/react';

export interface ChatSession {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'vulescan-chats';

export function getAllChats(): ChatSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading chats from localStorage:', error);
    return [];
  }
}

export function getChatById(id: string): ChatSession | null {
  const chats = getAllChats();
  return chats.find(chat => chat.id === id) || null;
}

export function saveChat(chat: ChatSession): void {
  try {
    const chats = getAllChats();
    const existingIndex = chats.findIndex(c => c.id === chat.id);
    
    if (existingIndex >= 0) {
      chats[existingIndex] = chat;
    } else {
      chats.unshift(chat);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Error saving chat to localStorage:', error);
  }
}

export function updateChatMessages(id: string, messages: UIMessage[]): void {
  const chat = getChatById(id);
  if (chat) {
    chat.messages = messages;
    chat.updatedAt = Date.now();
    
    // Generate title from first user message if no custom title
    if (chat.title === 'New Chat' && messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const textPart = firstUserMessage.parts.find(p => p.type === 'text');
        if (textPart && 'text' in textPart) {
          chat.title = textPart.text.slice(0, 50) + (textPart.text.length > 50 ? '...' : '');
        }
      }
    }
    
    saveChat(chat);
  }
}

export function deleteChat(id: string): void {
  try {
    const chats = getAllChats();
    const filtered = chats.filter(chat => chat.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting chat from localStorage:', error);
  }
}

export function createNewChat(id?: string): ChatSession {
  const chat: ChatSession = {
    id: id || Date.now().toString(),
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  saveChat(chat);
  return chat;
}
