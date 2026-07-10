export class RepositoryError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message)
    this.name = 'RepositoryError'
    this.cause = cause
    this.code = code ?? cause?.code
  }
}

export function wrapError(error, context) {
  if (error instanceof RepositoryError) throw error
  throw new RepositoryError(`${context}: ${error.message}`, { cause: error })
}
