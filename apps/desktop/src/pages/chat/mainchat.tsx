import React from 'react'
import { useParams } from 'react-router-dom'
import { ChatInterfaceAI } from '../../components/chat-interface-ai'

export const MainChat = () => {
  const params = useParams()
  const sessionId = params.id || 'default'

  return (
    <div className="h-screen">
      <ChatInterfaceAI sessionId={sessionId} />
    </div>
  )
}
