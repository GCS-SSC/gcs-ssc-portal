/** Shared integration contracts for the GC Design System components. */
export interface PortalButtonProps {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'link'
  disabled?: boolean
  loading?: boolean
}
export interface PortalInputProps {
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
export interface PortalSelectProps {
  id: string
  modelValue: string
  label: string
  options: { value: string; label: string }[]
  required?: boolean
  disabled?: boolean
  hint?: string
  error?: string
}
export interface PortalNoticeProps {
  variant?: 'info' | 'success' | 'error'
  title?: string
}
export interface PortalBadgeProps {
  tone?: 'neutral' | 'success' | 'warning'
}
export interface PortalLinkProps {
  to: string
  external?: boolean
}
export interface PortalShellProps {
  locale: 'en' | 'fr'
  signedIn: boolean
  userName?: string
  currentPath: string
  navigation?: { to: string; label: string }[]
  portalTitle?: string
}
// Shell emits signout and locale ('en' | 'fr'), and renders its default slot.
// Input/Select emit update:modelValue (string); Button forwards click events.

export interface PortalFileProps {
  id: string
  label: string
  hint?: string
  disabled?: boolean
}
// PortalFile emits change (File | null). It is optional; an Upload action requires a selected file.
