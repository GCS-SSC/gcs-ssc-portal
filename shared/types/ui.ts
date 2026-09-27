/** Shared integration contracts for the GC Design System components. */
export interface PortalButtonProps {
  size?: 'regular' | 'small'
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger'
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
  inputmode?: 'decimal'
}
export interface PortalTextareaProps {
  id: string
  modelValue: string
  label: string
  hint?: string
  maxlength?: number
  rows?: number
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
  titleTag?: 'h2' | 'h3'
}
export interface PortalBadgeProps {
  tone?: 'neutral' | 'success' | 'warning'
  colour?: string
}
export interface PortalLinkProps {
  variant?: 'button'
  size?: 'regular' | 'small'
  buttonRole?: 'primary' | 'secondary' | 'danger'
  to: string
  external?: boolean
}
export interface PortalShellProps {
  breadcrumbs?: { to: string; label: string }[]
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
