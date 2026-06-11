export interface ExpiryOption {
  label: string
  value: number
}

export type ExpiryUnit = "minutes" | "hours" | "days"

export const CUSTOM_EXPIRY_OPTION_VALUE = "custom"
export const MIN_EXPIRY_TIME = 60 * 1000

export const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: 'expiry.1hour', value: 1000 * 60 * 60 },
  { label: 'expiry.24hours', value: 1000 * 60 * 60 * 24 },
  { label: 'expiry.3days', value: 1000 * 60 * 60 * 24 * 3 },
  { label: 'expiry.7days', value: 1000 * 60 * 60 * 24 * 7 },
  { label: 'expiry.permanent', value: 0 }
]

export function calculateExpiryTime(unit: ExpiryUnit, value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    return Number.NaN
  }

  switch (unit) {
    case "minutes":
      return value * 60 * 1000
    case "hours":
      return value * 60 * 60 * 1000
    case "days":
      return value * 24 * 60 * 60 * 1000
  }
}

export function isValidExpiryTime(expiryTime: number): boolean {
  if (expiryTime === 0) {
    return true
  }

  return Number.isSafeInteger(expiryTime) && expiryTime >= MIN_EXPIRY_TIME
}
