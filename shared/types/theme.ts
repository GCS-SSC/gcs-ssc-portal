/** Stable, vendor-neutral component contract implemented by every build-time theme. */
export interface ThemeButtonProps {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'link'
  disabled?: boolean
  loading?: boolean
}
export interface ThemeInputProps {
  id: string
  modelValue: string
  label: string
  type?: 'text' | 'email' | 'password' | 'tel'
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  autocomplete?: string
  hint?: string
  error?: string
  minlength?: number
  maxlength?: number
}
export interface ThemeSelectProps {
  id: string
  modelValue: string
  label: string
  options: { value: string; label: string }[]
  required?: boolean
  disabled?: boolean
  hint?: string
  error?: string
}
export interface ThemeNoticeProps {
  variant?: 'info' | 'success' | 'error'
  title?: string
}
export interface ThemeBadgeProps {
  tone?: 'neutral' | 'success' | 'warning'
}
export interface ThemeLinkProps {
  to: string
  external?: boolean
}
export interface ThemeShellProps {
  locale: 'en' | 'fr'
  signedIn: boolean
  userName?: string
  currentPath: string
  navigation?: { to: string; label: string }[]
  portalTitle?: string
}
// Shell emits signout and locale ('en' | 'fr'), and renders its default slot.
// Input/Select emit update:modelValue (string); Button forwards click events.
// ThemeRoot renders its default slot and provides vendor context if needed.

export interface ThemeFileProps {
  id: string
  label: string
  hint?: string
  disabled?: boolean
}
// ThemeFile emits change (File | null). It is optional; an Upload action requires a selected file.
