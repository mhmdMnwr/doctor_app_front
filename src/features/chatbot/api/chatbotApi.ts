import { API_ROUTES } from '../../../shared/constants/api'
import { httpClient } from '../../../shared/services/httpClient'
import type { ChatbotMessageRequest, ChatbotMessageResponse } from '../types/chatbot.types'

export const chatbotApi = {
  sendMessage(payload: ChatbotMessageRequest): Promise<ChatbotMessageResponse> {
    return httpClient.post<ChatbotMessageResponse, ChatbotMessageRequest>(
      API_ROUTES.CHATBOT.MESSAGE,
      {
        message: payload.message.trim(),
        systemInstruction: payload.systemInstruction?.trim() || undefined,
      },
      { requiresAuth: true },
    )
  },
}
