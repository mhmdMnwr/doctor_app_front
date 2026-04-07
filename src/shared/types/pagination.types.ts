export interface PaginationQuery {
  page?: number
  limit?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  message: string
  data: T[]
  pagination: PaginationMeta
}

export interface DateRangeQuery {
  date: string
  endDate?: string
}
