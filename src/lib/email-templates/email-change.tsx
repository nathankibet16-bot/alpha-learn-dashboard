import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Shell, CTA, KV, card, h1, p, accent } from './_shared'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Shell preview={`Confirm your email change for ${siteName}`}>
    <Heading style={h1}>Confirm your email change</Heading>
    <Text style={p}>
      A request was made to change the email on your{' '}
      <span style={accent}>{siteName}</span> account.
    </Text>
    <div style={card}>
      <KV label="From" value={oldEmail} />
      <KV label="To" value={newEmail} />
    </div>
    <CTA href={confirmationUrl} label="Confirm email change" />
    <Text style={{ ...p, fontSize: '13px' }}>
      If you didn't request this change, please secure your account immediately.
    </Text>
  </Shell>
)

export default EmailChangeEmail
