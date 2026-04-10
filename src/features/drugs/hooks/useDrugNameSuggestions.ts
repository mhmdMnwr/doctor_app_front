import { useEffect, useMemo, useRef, useState } from 'react'

import { ApiError } from '../../../shared/services/httpClient'
import { drugsApi } from '../api/drugsApi'

const DEFAULT_DEBOUNCE_MS = 500
const DEFAULT_MIN_QUERY_LENGTH = 2
const MAX_CACHE_ENTRIES = 40

export const DRUG_SEARCH_UNAVAILABLE_MESSAGE = 'Drug service temporarily unavailable, try again.'

interface UseDrugNameSuggestionsOptions {
  debounceMs?: number
  minQueryLength?: number
}

interface UseDrugNameSuggestionsResult {
  suggestions: string[]
  isLoading: boolean
  softMessage: string | null
}

const normalizeQuery = (value: string): string => value.trim().toLowerCase()

const cleanSuggestions = (values: string[]): string[] => {
  const deduplicated = values
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, items) => {
      const normalizedItem = normalizeQuery(item)
      return items.findIndex((candidate) => normalizeQuery(candidate) === normalizedItem) === index
    })

  return deduplicated.slice(0, 10)
}

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  return error instanceof Error && error.name === 'AbortError'
}

const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false
  }

  const normalizedMessage = error.message.trim().toLowerCase()

  return (
    error instanceof TypeError ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('network error') ||
    normalizedMessage.includes('load failed')
  )
}

export const useDrugNameSuggestions = (
  query: string,
  options: UseDrugNameSuggestionsOptions = {},
): UseDrugNameSuggestionsResult => {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const minQueryLength = options.minQueryLength ?? DEFAULT_MIN_QUERY_LENGTH

  const normalizedQuery = useMemo(() => normalizeQuery(query), [query])
  const cacheRef = useRef<Map<string, string[]>>(new Map())
  const controllerRef = useRef<AbortController | null>(null)

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [softMessage, setSoftMessage] = useState<string | null>(null)

  useEffect(() => {
    controllerRef.current?.abort()
    controllerRef.current = null

    if (normalizedQuery.length < minQueryLength) {
      setSuggestions([])
      setIsLoading(false)
      setSoftMessage(null)
      return
    }

    const cached = cacheRef.current.get(normalizedQuery)

    if (cached) {
      setSuggestions(cached)
      setIsLoading(false)
      setSoftMessage(null)
      return
    }

    setIsLoading(true)
    setSoftMessage(null)

    const timeoutId = window.setTimeout(async () => {
      const controller = new AbortController()
      controllerRef.current = controller

      try {
        const response = await drugsApi.searchByName(normalizedQuery, {
          signal: controller.signal,
        })

        const cleaned = cleanSuggestions(response)

        cacheRef.current.set(normalizedQuery, cleaned)

        if (cacheRef.current.size > MAX_CACHE_ENTRIES) {
          const oldestKey = cacheRef.current.keys().next().value

          if (oldestKey) {
            cacheRef.current.delete(oldestKey)
          }
        }

        setSuggestions(cleaned)
      } catch (error) {
        if (isAbortError(error)) {
          return
        }

        setSuggestions([])

        if ((error instanceof ApiError && error.status === 503) || isNetworkError(error)) {
          setSoftMessage(DRUG_SEARCH_UNAVAILABLE_MESSAGE)
        } else {
          setSoftMessage(null)
        }
      } finally {
        if (controllerRef.current === controller) {
          setIsLoading(false)
          controllerRef.current = null
        }
      }
    }, debounceMs)

    return () => {
      window.clearTimeout(timeoutId)
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [debounceMs, minQueryLength, normalizedQuery])

  return {
    suggestions,
    isLoading,
    softMessage,
  }
}
