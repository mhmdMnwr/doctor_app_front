const TECHNICAL_ERROR_PATTERNS = [
  'failed to fetch',
  'networkerror',
  'network error',
  'request failed with status code',
  'timeout',
  'timed out',
  'cors',
  'json',
  'unexpected token',
  'cannot read',
  'undefined',
  'null',
  'ecconn',
  'enotfound',
]

const normalizeMessage = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ')
}

const toFriendlyStatusMessage = (message: string): string | null => {
  const statusMatch = message.match(/(?:statut|status(?: code)?)\s*(\d{3})/i)

  if (!statusMatch) {
    return null
  }

  const status = Number(statusMatch[1])

  if (status === 400 || status === 422) {
    return 'Certaines informations ne sont pas valides. Verifiez les champs et reessayez.'
  }

  if (status === 401) {
    return 'Votre session a expire. Veuillez vous reconnecter.'
  }

  if (status === 403) {
    return 'Vous n avez pas l autorisation pour cette action.'
  }

  if (status === 404) {
    return 'L element demande est introuvable.'
  }

  if (status === 409) {
    return 'Cette action entre en conflit avec des donnees existantes.'
  }

  if (status === 429) {
    return 'Trop de tentatives. Merci de patienter quelques instants puis de reessayer.'
  }

  if (status >= 500) {
    return 'Le serveur rencontre un probleme. Merci de reessayer dans quelques instants.'
  }

  return null
}

const isTechnicalMessage = (message: string): boolean => {
  const normalized = message.toLowerCase()
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))
}

export const getErrorMessage = (
  error: unknown,
  fallbackMessage = 'Une erreur inattendue est survenue.',
): string => {
  if (error instanceof Error && error.message.trim()) {
    const normalizedMessage = normalizeMessage(error.message)
    const statusMessage = toFriendlyStatusMessage(normalizedMessage)

    if (statusMessage) {
      return statusMessage
    }

    if (isTechnicalMessage(normalizedMessage)) {
      return fallbackMessage
    }

    return normalizedMessage
  }

  return fallbackMessage
}
