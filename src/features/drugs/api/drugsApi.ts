import { API_ROUTES } from '../../../shared/constants/api'
import { PAGINATION } from '../../../shared/constants/pagination'
import { httpClient } from '../../../shared/services/httpClient'
import type { PaginationQuery } from '../../../shared/types/pagination.types'
import { withQueryParams } from '../../../shared/utils/query'
import type { DrugDetails, DrugListItem, DrugsListResponse } from '../types/drugs.types'

const MAX_DRUGS_LIMIT = 100

interface DrugSearchOptions {
  signal?: AbortSignal
}

const drugByIdPath = (id: string): string => `${API_ROUTES.DRUGS.BASE}/${encodeURIComponent(id)}`

export const drugsApi = {
  searchByName(name: string, options: DrugSearchOptions = {}): Promise<string[]> {
    const normalizedName = name.trim()

    if (!normalizedName) {
      return Promise.resolve([])
    }

    const path = withQueryParams(API_ROUTES.DRUGS.SEARCH, {
      name: normalizedName,
    })

    return httpClient.get<string[]>(path, {
      requiresAuth: true,
      signal: options.signal,
    })
  },

  resolveByName(name: string, options: DrugSearchOptions = {}): Promise<DrugListItem> {
    const normalizedName = name.trim()

    const path = withQueryParams(API_ROUTES.DRUGS.RESOLVE, {
      name: normalizedName,
    })

    return httpClient.get<DrugListItem>(path, {
      requiresAuth: true,
      signal: options.signal,
    })
  },

  getDrugs(query: PaginationQuery = {}): Promise<DrugsListResponse> {
    const requestedLimit = query.limit ?? PAGINATION.DEFAULT_LIMIT
    const normalizedLimit = Math.min(Math.max(requestedLimit, 1), MAX_DRUGS_LIMIT)

    const path = withQueryParams(API_ROUTES.DRUGS.BASE, {
      page: query.page ?? PAGINATION.DEFAULT_PAGE,
      limit: normalizedLimit,
    })

    return httpClient.get<DrugsListResponse>(path, { requiresAuth: true })
  },

  getDrugById(id: string): Promise<DrugDetails> {
    return httpClient.get<DrugDetails>(drugByIdPath(id), { requiresAuth: true })
  },
}
