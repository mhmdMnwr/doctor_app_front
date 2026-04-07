export const withQueryParams = (
  path: string,
  query: Record<string, string | number | undefined>,
): string => {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value))
    }
  })

  const queryString = params.toString()

  if (!queryString) {
    return path
  }

  return `${path}?${queryString}`
}
