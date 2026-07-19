import * as React from 'react'
import { render } from '@react-email/render'
import { WebhookError, verifyWebhookRequest } from '@lovable.dev/webhooks-js'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "Alpha Traders"
const SENDER_DOMAIN = "notify.alphatradersgrp.com"
const ROOT_DOMAIN = "alphatradersgrp.com"
const FROM_ADDRESS = `Alpha Traders <no-reply@${SENDER_DOMAIN}>`
const SITE_URL = `https://${ROOT_DOMAIN}`

type AuthAction = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'reauthentication'
type AuthEmailPayload = {
  version: string
  type: 'auth'
  run_id?: string
  environment?: 'dev' | 'prod'
  data: {
    action_type: AuthAction
    url: string
    email: string
    old_email: string | null
    new_email: string | null
    site_url: string | null
    token: string | null
    new_token: string | null
  }
}

const WEBHOOK_ERROR_STATUS: Record<string, number> = {
  missing_secret: 401,
  missing_timestamp: 401,
  invalid_timestamp: 401,
  stale_timestamp: 401,
  invalid_signature: 401,
  body_too_large: 400,
  invalid_json: 400,
  invalid_payload: 400,
}

function parseAuthPayload(body: string): AuthEmailPayload {
  const parsed = JSON.parse(body) as AuthEmailPayload
  if (!parsed || typeof parsed !== 'object' || parsed.type !== 'auth' || !parsed.data || typeof parsed.data.email !== 'string') {
    throw new Error('Invalid auth email webhook payload')
  }
  return parsed
}

function emailContent(data: AuthEmailPayload['data']): { subject: string; element: React.ReactElement } {
  if (data.action_type === 'signup') {
    return {
      subject: 'Your Alpha Traders verification code',
      element: React.createElement(SignupEmail, {
        siteName: SITE_NAME,
        siteUrl: SITE_URL,
        recipient: data.email,
        token: data.token ?? '',
      }),
    }
  }
  if (data.action_type === 'invite') {
    return {
      subject: "You've been invited",
      element: React.createElement(InviteEmail, { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: data.url }),
    }
  }
  if (data.action_type === 'magiclink') {
    return {
      subject: 'Your login link',
      element: React.createElement(MagicLinkEmail, { siteName: SITE_NAME, confirmationUrl: data.url }),
    }
  }
  if (data.action_type === 'recovery') {
    return {
      subject: 'Reset your password',
      element: React.createElement(RecoveryEmail, { siteName: SITE_NAME, confirmationUrl: data.url }),
    }
  }
  if (data.action_type === 'email_change') {
    return {
      subject: 'Confirm your new email',
      element: React.createElement(EmailChangeEmail, {
        siteName: SITE_NAME,
        oldEmail: data.old_email ?? '',
        email: data.email,
        newEmail: data.new_email ?? '',
        confirmationUrl: data.url,
      }),
    }
  }
  return {
    subject: 'Your Alpha Traders verification code',
    element: React.createElement(ReauthenticationEmail, { token: data.token ?? '' }),
  }
}

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY
        if (!apiKey) return Response.json({ error: 'Server configuration error' }, { status: 500 })

        let event: AuthEmailPayload
        try {
          ;({ payload: event } = await verifyWebhookRequest<AuthEmailPayload>({ req: request, secret: apiKey, parser: parseAuthPayload }))
        } catch (error) {
          if (error instanceof WebhookError) {
            return Response.json({ error: error.message }, { status: WEBHOOK_ERROR_STATUS[error.code] ?? 400 })
          }
          console.error('[auth-email] webhook verification failed')
          return Response.json({ error: 'Webhook verification failed' }, { status: 500 })
        }

        if (!event.run_id) return Response.json({ error: 'Missing run_id' }, { status: 400 })
        if (event.version !== '1') return Response.json({ error: `Unsupported payload version: ${event.version}` }, { status: 400 })

        const { subject, element } = emailContent(event.data)
        const html = await render(element)
        const text = await render(element, { plainText: true })
        const { sendLoggedEmail } = await import('@/lib/email-delivery.server')
        const result = await sendLoggedEmail({
          recipient: event.data.email,
          emailType: `auth-${event.data.action_type}`,
          subject,
          html,
          text,
          runId: event.run_id,
          sender: FROM_ADDRESS,
          senderDomain: SENDER_DOMAIN,
          label: event.data.action_type,
        })

        if (!result.accepted) {
          return Response.json({ error: 'Email send rejected' }, { status: result.retryable ? 500 : 400 })
        }

        return Response.json({ success: true, sent: true, attempt_id: result.attemptId, message_id: result.providerMessageId })
      },
    },
  },
})
