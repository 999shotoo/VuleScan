import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from 'ai'
import { getChatById, createNewChat, updateChatMessages } from '../../lib/chat-storage'

const models = [
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
]

export const SimpleChat = () => {
  const params = useParams()
  const location = useLocation()
  const sessionId = params.id || Date.now().toString()
  const [text, setText] = useState("")
  const [model, setModel] = useState(models[0].id)
  const [initialMessageSent, setInitialMessageSent] = useState(false)

  const { messages, sendMessage, status, setMessages, error, regenerate } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "http://localhost:3000/api/chat",
    }),
  })

  // Load chat
  useEffect(() => {
    const existingChat = getChatById(sessionId)
    if (existingChat?.messages.length > 0) {
      setMessages(existingChat.messages)
      setInitialMessageSent(true)
    }
  }, [sessionId, setMessages])

  // Handle initial message from navigation state
  useEffect(() => {
    const initialMessage = (location.state as any)?.initialMessage
    if (initialMessage && !initialMessageSent && messages.length === 0) {
      sendMessage({ text: initialMessage, files: [] }, { body: { model } })
      setInitialMessageSent(true)
    }
  }, [location.state, initialMessageSent, messages.length, sendMessage, model])

  // Save messages
  useEffect(() => {
    if (messages.length > 0) {
      updateChatMessages(sessionId, messages)
    }
  }, [messages, sessionId])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || status === "streaming") return

    sendMessage({ text, files: [] }, { body: { model } })
    setText("")
  }, [text, status, sendMessage, model])

  const copyText = useCallback(async (messageText: string) => {
    try {
      await navigator.clipboard.writeText(messageText)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }, [])

  const regenerateResponse = useCallback(async (messageId: string) => {
    try {
      await regenerate({ messageId, body: { model } })
    } catch (err) {
      console.error('Regenerate failed:', err)
    }
  }, [regenerate, model])

  const isLoading = status === "streaming" || status === "submitted"

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <select 
          value={model} 
          onChange={(e) => setModel(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <h2 className="text-xl font-semibold mb-2">VuleScan AI Chat</h2>
            <p>Start a conversation with AI</p>
          </div>
        )}

        {messages.map((message, i) => (
          <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              message.role === "user" 
                ? "bg-blue-500 text-white" 
                : "bg-gray-600 text-white"
            }`}>
              {message.role === "user" ? "U" : "AI"}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <div className="bg-muted rounded-lg p-3">
                {message.parts.map((part, j) => {
                  if (part.type === "text") {
                    return <div key={j} className="whitespace-pre-wrap">{part.text}</div>
                  }
                  return null
                })}
              </div>

              {/* Actions */}
              {message.role === "assistant" && message.parts.length > 0 && !isLoading && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => copyText(message.parts.filter(p => p.type === "text").map(p => p.text).join(""))}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-muted"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => regenerateResponse(message.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-muted"
                  >
                    🔄 Regenerate
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-sm font-semibold">
              AI
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                </div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg">
            <strong>Error:</strong> {error.message}
            <button 
              onClick={() => regenerate({ body: { model } })}
              className="ml-2 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border rounded-md bg-background"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  )
}
