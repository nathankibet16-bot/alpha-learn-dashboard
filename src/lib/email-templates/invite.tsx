import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Shell, CTA, h1, p, accent } from './_shared'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <Shell preview={`You've been invited to join ${siteName}`}>
    <Heading style={h1}>You've been invited</Heading>
    <Text style={p}>
      You've been invited to join <span style={accent}>{siteName}</span>. Click
      the button below to accept the invitation and set up your trading account.
    </Text>
    <CTA href={confirmationUrl} label="Accept invitation" />
    <Text style={{ ...p, fontSize: '13px' }}>
      If you weren't expecting this invitation, you can safely ignore this email.
    </Text>
  </Shell>
)

export default InviteEmail
