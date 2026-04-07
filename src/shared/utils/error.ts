export const getErrorMessage = (
  error: unknown,
  fallbackMessage = 'Une erreur inattendue est survenue.',
): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}
