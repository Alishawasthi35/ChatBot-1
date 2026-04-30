import { useState } from 'react'
import './App.css'
import { useAuth } from './hooks/useAuth'
import { useChat } from './hooks/useChat'

const promptSuggestions = [
  'Explain REST APIs like I am moving from Python to full-stack.',
  'Create a 30-day React hooks learning roadmap.',
  'Review this project idea for my AI/ML portfolio.',
  'Give me a simple agent architecture for a research assistant.',
]

function AuthScreen({ auth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isRegister = mode === 'register'

  function updateField(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    auth.setError('')

    try {
      if (isRegister) {
        await auth.register(form)
      } else {
        await auth.login(form)
      }
    } catch (error) {
      auth.setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <div className="brand-row">
          <span className="brand-logo">HF</span>
          <span>React AI Chatbot</span>
        </div>
        <p className="eyebrow">Portfolio project</p>
        <h1>Chat with an open-source model through your own REST API.</h1>
        <p className="hero-copy">
          Register, log in, send prompts, and watch each backend request appear in your live Express terminal.
        </p>
        <div className="hero-metrics">
          <span>React hooks</span>
          <span>Protected REST</span>
          <span>Hugging Face</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="card-heading">
          <p className="eyebrow">{isRegister ? 'Create account' : 'Welcome back'}</p>
          <h2>{isRegister ? 'Start your workspace' : 'Log in to continue'}</h2>
          <p>
            {isRegister
              ? 'Your user is stored locally in data/users.json.'
              : 'Use your local account to open the chatbot.'}
          </p>
        </div>

        <div className="mode-switch" aria-label="Choose authentication mode">
          <button className={!isRegister ? 'active' : ''} type="button" onClick={() => setMode('login')}>
            Login
          </button>
          <button className={isRegister ? 'active' : ''} type="button" onClick={() => setMode('register')}>
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label>
              Name
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Asha Sharma"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              placeholder="asha@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              placeholder="Minimum 6 characters"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
          </label>

          {auth.error && <div className="form-error">{auth.error}</div>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Working...' : isRegister ? 'Create account' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  )
}

function ChatSidebar({ user, sessions, activeSessionId, onSelectSession, onNewChat, onClearChats, onLogout }) {
  return (
    <aside className="chat-sidebar">
      <div className="sidebar-top">
        <div className="brand-row compact">
          <span className="brand-logo">HF</span>
          <span>HF Chat</span>
        </div>
        <button className="new-chat-button" type="button" onClick={onNewChat}>
          New chat
        </button>
      </div>

      <div className="conversation-list">
        {sessions.map((session) => (
          <button
            className={`conversation-item ${session.id === activeSessionId ? 'active' : ''}`}
            key={session.id}
            type="button"
            onClick={() => onSelectSession(session.id)}
          >
            <span>{session.title}</span>
            <small>{session.messages.length} messages</small>
          </button>
        ))}
      </div>

      <div className="sidebar-user">
        <div>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
        <button type="button" onClick={onClearChats}>
          Clear chats
        </button>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  )
}

function EmptyState({ onSuggestion }) {
  return (
    <section className="empty-state">
      <div className="orb" />
      <p className="eyebrow">Ask anything</p>
      <h1>What should we build or learn today?</h1>
      <p>
        This interface is powered by React hooks, your Express REST API, and a Hugging Face model on the backend.
      </p>
      <div className="suggestion-grid">
        {promptSuggestions.map((prompt) => (
          <button key={prompt} type="button" onClick={() => onSuggestion(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
    </section>
  )
}

function MessageThread({ messages, isSending }) {
  return (
    <div className="message-thread">
      {messages.map((message) => (
        <article className={`message ${message.role}`} key={message.id}>
          <div className="avatar">{message.role === 'user' ? 'You' : 'AI'}</div>
          <div className="bubble">
            <p>{message.content}</p>
          </div>
        </article>
      ))}

      {isSending && (
        <article className="message assistant">
          <div className="avatar">AI</div>
          <div className="bubble typing">
            <span />
            <span />
            <span />
          </div>
        </article>
      )}
    </div>
  )
}

function Composer({ isSending, onSend }) {
  const [draft, setDraft] = useState('')

  function submitMessage() {
    if (!draft.trim() || isSending) {
      return
    }

    onSend(draft)
    setDraft('')
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitMessage()
    }
  }

  return (
    <div className="composer">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message the model..."
        rows={1}
      />
      <button disabled={isSending || !draft.trim()} type="button" onClick={submitMessage}>
        Send
      </button>
    </div>
  )
}

function ChatApp({ auth }) {
  const chat = useChat(auth.token)
  const messages = chat.activeSession?.messages || []

  return (
    <main className="chat-layout">
      <ChatSidebar
        user={auth.user}
        sessions={chat.sessions}
        activeSessionId={chat.activeSessionId}
        onSelectSession={chat.selectSession}
        onNewChat={chat.startNewChat}
        onClearChats={chat.clearChats}
        onLogout={auth.logout}
      />

      <section className="chat-main">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Protected chat</p>
            <h2>{chat.activeSession?.title || 'New chat'}</h2>
          </div>
          <div className="model-pill">HF_MODEL ready</div>
        </header>

        <div className="chat-scroll">
          {messages.length === 0 ? (
            <EmptyState onSuggestion={chat.sendMessage} />
          ) : (
            <MessageThread messages={messages} isSending={chat.isSending} />
          )}
        </div>

        {chat.error && <div className="chat-error">{chat.error}</div>}

        <Composer isSending={chat.isSending} onSend={chat.sendMessage} />
      </section>
    </main>
  )
}

function App() {
  const auth = useAuth()

  if (auth.status === 'checking') {
    return <div className="loading-screen">Checking your session...</div>
  }

  return auth.user ? <ChatApp auth={auth} /> : <AuthScreen auth={auth} />
}

export default App
