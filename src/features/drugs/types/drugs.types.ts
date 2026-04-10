export interface DrugListItem {
  id: string
  name: string
  generic_name: string
}

export interface DrugDetails extends DrugListItem {
  purpose?: string
  indications_and_usage?: string
  warnings?: string
}

export interface DrugsListResponse {
  data: DrugListItem[]
  page: number
  total: number
}
