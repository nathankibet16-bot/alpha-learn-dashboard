import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Shell, CTA, h1, p, accent } from './_shared'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Shell preview={`Reset your password for ${siteName}`}>
    <Heading style={h1}>Reset your password</Heading>
    <Text style={p}>
      We received a request to reset the password on your{' '}
      <span style={accent}>{siteName}</span> account. Click the button below to
      choose a new password.
    </Text>
    <CTA href={confirmationUrl} label="Reset password" />
    <Text style={{ ...p, fontSize: '13px' }}>
      If you didn't request a password reset, you can safely ignore this email —
      your password will not change.
    </Text>
  </Shell>
)

export default RecoveryEmail
