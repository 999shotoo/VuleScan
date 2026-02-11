import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { MessageSquare, Plus, Clock } from 'lucide-react'

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

export const ChatHome = () => {
  const navigate = useNavigate()
  const [sessions] = useState<ChatSession[]>([
    {
      id: '234456',
      title: 'Network Scan Discussion',
      lastMessage: 'Can you scan 192.168.1.1 for vulnerabilities?',
      timestamp: '2 hours ago',
    },
    {
      id: '345567',
      title: 'Subdomain Enumeration',
      lastMessage: 'Find subdomains for example.com',
      timestamp: 'Yesterday',
    },
    {
      id: '456678',
      title: 'Security Assessment',
      lastMessage: 'What are the best practices for penetration testing?',
      timestamp: '2 days ago',
    },
  ])

  const handleNewChat = () => {
    const newId = Date.now().toString()
    navigate(`/chat/${newId}`)
  }

  return (
    <div className="h-screen p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Security Assistant</h1>
            <p className="text-muted-foreground mt-1">
              Start a conversation about vulnerability scanning and security testing
            </p>
          </div>
          <Button onClick={handleNewChat} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Chat
          </Button>
        </div>

        <div className="grid gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Conversations
          </h2>
          
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm mt-1">Start a new chat to begin</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Link key={session.id} to={`/chat/${session.id}`}>
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {session.title}
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span className="line-clamp-1">{session.lastMessage}</span>
                      <span className="text-xs whitespace-nowrap ml-2">{session.timestamp}</span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">What can I help you with?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Network vulnerability scanning and port analysis</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Subdomain discovery and enumeration</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Security testing and brute force analysis (authorized only)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Directory and file enumeration</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
