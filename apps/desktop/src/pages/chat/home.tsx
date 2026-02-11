import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { MessageSquare, Plus, ShieldCheck, Lock, Code, Network, FileSearch } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { getAllChats, ChatSession, createNewChat } from '../../lib/chat-storage'

export const ChatHome = () => {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [inputValue, setInputValue] = useState('')

  // Load chats from localStorage on mount
  useEffect(() => {
    const chats = getAllChats()
    setSessions(chats)
  }, [])

  const handleNewChat = () => {
    const newChat = createNewChat()
    setSessions([newChat, ...sessions])
    navigate(`/chat/${newChat.id}`)
  }

  const handleQuickStart = (text: string) => {
    const newChat = createNewChat()
    setSessions([newChat, ...sessions])
    navigate(`/chat/${newChat.id}`, { state: { initialMessage: text } })
  }

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      handleQuickStart(inputValue)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4">
        {/* Model Selector in top-right */}
        <div className="flex justify-end pt-4 pb-2">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3 mr-1" />
            VuleScan AI
          </Button>
        </div>

        {/* Centered Main Content */}
        <div className="min-h-[60vh] flex flex-col items-center justify-center py-12">
          {/* Greeting */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-normal text-foreground">
                {getGreeting()}, Security Pro
              </h1>
            </div>
          </div>

          {/* Large Centered Input */}
          <form onSubmit={handleInputSubmit} className="w-full max-w-2xl mb-8">
            <div className="relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type / for commands"
                className="w-full h-14 px-6 text-base rounded-3xl border-2 focus-visible:ring-offset-0 focus-visible:ring-1"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* Suggestion Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <Button
              onClick={() => handleQuickStart('Scan network for vulnerabilities')}
              variant="outline"
              size="sm"
              className="rounded-full h-9 px-4 text-sm"
            >
              <Lock className="h-4 w-4 mr-2" />
              Network Scan
            </Button>
            <Button
              onClick={() => handleQuickStart('Find subdomains for a domain')}
              variant="outline"
              size="sm"
              className="rounded-full h-9 px-4 text-sm"
            >
              <Code className="h-4 w-4 mr-2" />
              Subdomain Search
            </Button>
            <Button
              onClick={() => handleQuickStart('Check for open ports')}
              variant="outline"
              size="sm"
              className="rounded-full h-9 px-4 text-sm"
            >
              <Network className="h-4 w-4 mr-2" />
              Port Analysis
            </Button>
            <Button
              onClick={() => handleQuickStart('Perform directory enumeration')}
              variant="outline"
              size="sm"
              className="rounded-full h-9 px-4 text-sm"
            >
              <FileSearch className="h-4 w-4 mr-2" />
              Directory Enum
            </Button>
          </div>
        </div>

        {/* Recent Conversations - Minimal */}
        {sessions.length > 0 && (
          <div className="pb-8 space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground px-2">Recent</h2>
            <div className="space-y-1">
              {sessions.slice(0, 10).map((session) => (
                <Link key={session.id} to={`/chat/${session.id}`}>
                  <div className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(session.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
