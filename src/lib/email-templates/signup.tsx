import * as React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import { Shell, h1, p, accent } from './_shared'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  token: string
}

export const SignupEmail = ({ siteName, recipient, token }: SignupEmailProps) => (
  <Shell preview={`Your verification code is ${token}`}>
    <Heading style={h1}>Your verification code</Heading>
    <Text style={p}>
      Your verification code is:
    </Text>
    <Section style={codeBox}>
      <Text style={codeText}>{token}</Text>
    </Section>
    <Text style={p}>This code expires in 10 minutes.</Text>
    <Text style={{ ...p, fontSize: '13px' }}>
      If you did not request this code, you can ignore this email
      {recipient ? <> for <span style={{ color: '#ffffff' }}>{recipient}</span></> : null}.
    </Text>
  </Shell>
)

export default SignupEmail

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
