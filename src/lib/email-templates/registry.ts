import type { ComponentType } from 'react'
import { template as depositSubmitted } from './deposit-submitted'
import { template as depositApproved } from './deposit-approved'
import { template as withdrawalSubmitted } from './withdrawal-submitted'
import { template as withdrawalCompleted } from './withdrawal-completed'
import { template as withdrawalRejected } from './withdrawal-rejected'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'deposit-submitted': depositSubmitted,
  'deposit-approved': depositApproved,
  'withdrawal-submitted': withdrawalSubmitted,
  'withdrawal-completed': withdrawalCompleted,
  'withdrawal-rejected': withdrawalRejected,
}
