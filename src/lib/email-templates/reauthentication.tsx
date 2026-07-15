import * as React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import { Shell, h1, p } from './_shared'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Shell preview={`Your verification code is ${token}`}>
    <Heading style={h1}>Confirm reauthentication</Heading>
    <Text style={p}>Use the code below to confirm your identity:</Text>
    <Section style={codeBox}>
      <Text style={codeText}>{token}</Text>
    </Section>
    <Text style={{ ...p, fontSize: '13px' }}>
      This code will expire shortly. If you didn't request this, you can safely
      ignore this email.
    </Text>
  </Shell>
)

export default ReauthenticationEmail

const codeBox = {
  background: '#000000',
  border: '1px solid #10b981',
  borderRadius: '12px',
  padding: '22px 24px',
  textAlign: 'center' as const,
  margin: '20px 0 8px',
}
const codeText = {
  color: '#10b981',
  fontSize: '34px',
  fontWeight: 700 as const,
  letterSpacing: '10px',
  margin: 0,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}
