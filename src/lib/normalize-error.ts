export function normalizeError(error: unknown): {
  message: string
  code?: string
} {
  if (typeof error === 'string') {
    return { message: error }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as any).message
    if (typeof maybeMessage === 'string') {
      return { message: maybeMessage }
    }
  }

  return { message: 'An unexpected error occurred' }
}
