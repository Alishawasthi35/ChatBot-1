import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../lib/api'

const SESSIONS_KEY = 'hfReactChatSessions'

function createMessage(role, content) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

function createSession(title = 'New chat') {
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: new Date().toISOString(),
    messages: [],
  }
}

function readStoredSessions() {
  try {
    const sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY))
    return Array.isArray(sessions) && sessions.length > 0 ? sessions : [createSession()]
  } catch {
    return [createSession()]
  }
}

function makeTitle(message) {
  return message.length > 42 ? `${message.slice(0, 42)}...` : message
}

export function useChat(token) {
  const [sessions, setSessions] = useState(readStoredSessions)
  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0]?.id || null)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0],
    [activeSessionId, sessions],
  )

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  }, [sessions])

  const startNewChat = useCallback(() => {
    const session = createSession()
    setSessions((currentSessions) => [session, ...currentSessions])
    setActiveSessionId(session.id)
    setError('')
  }, [])

  const selectSession = useCallback((sessionId) => {
    setActiveSessionId(sessionId)
    setError('')
  }, [])

  const clearChats = useCallback(() => {
    const session = createSession()
    setSessions([session])
    setActiveSessionId(session.id)
    setError('')
  }, [])

  const sendMessage = useCallback(
    async (content) => {
      const trimmedContent = content.trim()

      if (!trimmedContent || !activeSession) {
        return
      }

      const userMessage = createMessage('user', trimmedContent)
      const conversation = [...activeSession.messages, userMessage]

      setError('')
      setIsSending(true)
      setSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                title: session.messages.length === 0 ? makeTitle(trimmedContent) : session.title,
                messages: conversation,
              }
            : session,
        ),
      )

      try {
        const data = await apiRequest('/api/chat', {
          method: 'POST',
          token,
          body: {
            messages: conversation.map(({ role, content: messageContent }) => ({
              role,
              content: messageContent,
            })),
          },
        })
        const assistantMessage = createMessage('assistant', data.message)

        setSessions((currentSessions) =>
          currentSessions.map((session) =>
            session.id === activeSession.id
              ? {
                  ...session,
                  messages: [...conversation, assistantMessage],
                  model: data.model,
                }
              : session,
          ),
        )
      } catch (requestError) {
        const assistantMessage = createMessage(
          'assistant',
          requestError.message || 'I could not reach the model. Please try again.',
        )

        setError(requestError.message)
        setSessions((currentSessions) =>
          currentSessions.map((session) =>
            session.id === activeSession.id
              ? {
                  ...session,
                  messages: [...conversation, assistantMessage],
                }
              : session,
          ),
        )
      } finally {
        setIsSending(false)
      }
    },
    [activeSession, token],
  )

  return {
    sessions,
    activeSession,
    activeSessionId,
    isSending,
    error,
    sendMessage,
    startNewChat,
    selectSession,
    clearChats,
  }
}
