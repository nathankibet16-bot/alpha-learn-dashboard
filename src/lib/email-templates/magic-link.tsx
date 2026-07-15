import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Shell, CTA, h1, p, accent } from './_shared'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Shell preview={`Your login link for ${siteName}`}>
    <Heading style={h1}>Your login link</Heading>
    <Text style={p}>
      Click the button below to sign in to <span style={accent}>{siteName}</span>.
      This link will expire shortly.
    </Text>
    <CTA href={confirmationUrl} label="Log in to your account" />
    <Text style={{ ...p, fontSize: '13px' }}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
  </Shell>
)

export default MagicLinkEmail
