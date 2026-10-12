export class OnboardingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'OnboardingError'
  }
}

export class Beds24RequestError extends OnboardingError {
  constructor(message: string, details?: unknown) {
    super(message, 502, details)
    this.name = 'Beds24RequestError'
  }
}

export class CreditBudgetError extends OnboardingError {
  constructor(message: string, readonly resetsInSeconds: number | null) {
    super(message, 429)
    this.name = 'CreditBudgetError'
  }
}

export class StepPrerequisiteError extends OnboardingError {
  constructor(message: string) {
    super(message, 409)
    this.name = 'StepPrerequisiteError'
  }
}

export class OnboardingNotFoundError extends OnboardingError {
  constructor(message: string) {
    super(message, 404)
    this.name = 'OnboardingNotFoundError'
  }
}
