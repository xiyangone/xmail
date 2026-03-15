export interface ExpiryOption {
  label: string
  value: number
}

export const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: 'expiry.1hour', value: 1000 * 60 * 60 },
  { label: 'expiry.24hours', value: 1000 * 60 * 60 * 24 },
  { label: 'expiry.3days', value: 1000 * 60 * 60 * 24 * 3 },
  { label: 'expiry.permanent', value: 0 }
]
