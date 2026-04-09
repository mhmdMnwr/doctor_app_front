import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

import { getErrorMessage } from '../../../shared/utils/error'
import { chatbotApi } from '../api/chatbotApi'

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
}

const DEFAULT_SYSTEM_INSTRUCTION =
  'You are a concise medical office assistant. Keep answers short and clear.'
const CHATBOT_SESSION_STORAGE_KEY = 'doctor-app.chatbot.messages'

const isChatRole = (value: unknown): value is ChatRole => {
  return value === 'user' || value === 'assistant'
}

const toStoredMessage = (value: unknown, index: number): ChatMessage | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as { id?: unknown; role?: unknown; text?: unknown }

  if (!isChatRole(candidate.role) || typeof candidate.text !== 'string' || !candidate.text.trim()) {
    return null
  }

  const id =
    typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id
      : `chat-message-${index + 1}`

  return {
    id,
    role: candidate.role,
    text: candidate.text,
  }
}

const readSessionMessages = (): ChatMessage[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const serializedMessages = window.sessionStorage.getItem(CHATBOT_SESSION_STORAGE_KEY)

  if (!serializedMessages) {
    return []
  }

  try {
    const parsedMessages = JSON.parse(serializedMessages)

    if (!Array.isArray(parsedMessages)) {
      return []
    }

    return parsedMessages
      .map((message, index) => toStoredMessage(message, index))
      .filter((message): message is ChatMessage => message !== null)
  } catch {
    return []
  }
}

export function ChatbotSection() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readSessionMessages())
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const idCounterRef = useRef(messages.length)
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const threadBottomRef = useRef<HTMLDivElement | null>(null)

  const nextId = (): string => {
    idCounterRef.current += 1
    return `chat-message-${idCounterRef.current}`
  }

  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!messages.length) {
      window.sessionStorage.removeItem(CHATBOT_SESSION_STORAGE_KEY)
      return
    }

    window.sessionStorage.setItem(CHATBOT_SESSION_STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  const sendMessage = async (messageOverride?: string) => {
    const text = (messageOverride ?? draft).trim()

    if (!text || isSending) {
      return
    }

    setMessages((previous) => [
      ...previous,
      {
        id: nextId(),
        role: 'user',
        text,
      },
    ])

    setDraft('')
    setErrorMessage(null)
    setIsSending(true)

    try {
      const response = await chatbotApi.sendMessage({
        message: text,
        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
      })

      setMessages((previous) => [
        ...previous,
        {
          id: nextId(),
          role: 'assistant',
          text: response.data.reply,
        },
      ])
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Impossible de generer la reponse du chatbot.'))
    } finally {
      setIsSending(false)
    }
  }

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage()
  }

  const handleMessageKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  const clearConversation = () => {
    setMessages([])
    setErrorMessage(null)

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(CHATBOT_SESSION_STORAGE_KEY)
    }

    composerInputRef.current?.focus()
  }

  return (
    <section className="panel chat-simple">
      <div aria-live="polite" className="chat-simple__thread" role="log">
        {!messages.length && !isSending && <p className="chat-simple__empty">Aucune conversation pour le moment.</p>}

        {messages.map((message) => (
          <article className={`chat-simple__bubble chat-simple__bubble--${message.role}`} key={message.id}>
            <p>{message.text}</p>
          </article>
        ))}

        {isSending && (
          <article className="chat-simple__bubble chat-simple__bubble--assistant chat-simple__bubble--loading">
            <p>Generation de la reponse...</p>
          </article>
        )}

        <div ref={threadBottomRef} />
      </div>

      {errorMessage && <p className="status status--error">{errorMessage}</p>}

      <form className="chat-simple__composer" onSubmit={handleComposerSubmit}>
        <textarea
          aria-label="Message"
          className="chat-simple__input"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleMessageKeyDown}
          placeholder="Ecrivez votre message..."
          ref={composerInputRef}
          rows={3}
          value={draft}
        />

        <div className="chat-simple__actions">
          <button
            className="button button--ghost"
            disabled={!messages.length || isSending}
            onClick={clearConversation}
            type="button"
          >
            Effacer
          </button>
          <button className="button button--primary" disabled={isSending || !draft.trim()} type="submit">
            {isSending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </form>
    </section>
  )
}
