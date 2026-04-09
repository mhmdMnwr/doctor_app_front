import type { ApiDataResponse } from '../../../shared/types/api.types'

export interface ChatbotMessageRequest {
  message: string
  systemInstruction?: string
}

export interface ChatbotMessageData {
  model: string
  reply: string
}

export type ChatbotMessageResponse = ApiDataResponse<ChatbotMessageData>
