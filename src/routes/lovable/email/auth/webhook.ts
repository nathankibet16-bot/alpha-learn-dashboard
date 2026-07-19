import * as React from 'react'
import { render } from '@react-email/render'
import { createAuthEmailHandler } from '@lovable.dev/email-js'
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

const handler = createAuthEmailHandler({
  apiKey: process.env.LOVABLE_API_KEY!,
  from: FROM_ADDRESS,
  senderDomain: SENDER_DOMAIN,
  sendUrl: process.env.LOVABLE_SEND_URL,
  emails: {
    signup: {
      subject: 'Your Alpha Traders verification code',
      render: (data) =>
        React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: data.email,
          token: data.token ?? '',
        }),
    },
    invite: {
      subject: "You've been invited",
      render: (data) => React.createElement(InviteEmail, { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: data.url }),
    },
    magiclink: {
      subject: 'Your login link',
      render: (data) => React.createElement(MagicLinkEmail, { siteName: SITE_NAME, confirmationUrl: data.url }),
    },
    recovery: {
      subject: 'Reset your password',
      render: (data) => React.createElement(RecoveryEmail, { siteName: SITE_NAME, confirmationUrl: data.url }),
    },
    email_change: {
      subject: 'Confirm your new email',
      render: (data) =>
        React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: data.old_email ?? '',
          email: data.email,
          newEmail: data.new_email ?? '',
          confirmationUrl: data.url,
        }),
    },
    reauthentication: {
      subject: 'Your Alpha Traders verification code',
      render: (data) => React.createElement(ReauthenticationEmail, { token: data.token ?? '' }),
    },
  },
})

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handler(request)
      },
    },
  },
})
