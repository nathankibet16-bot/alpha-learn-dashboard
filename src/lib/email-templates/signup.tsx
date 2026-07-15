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
  <Shell preview={`Your ${siteName} verification code is ${token}`}>
    <Heading style={h1}>Confirm your email</Heading>
    <Text style={p}>
      Welcome to <span style={accent}>{siteName}</span>. Enter the verification
      code below on the confirmation screen to finish creating your account
      {recipient ? <> for <span style={{ color: '#ffffff' }}>{recipient}</span></> : null}.
    </Text>
    <Section style={codeBox}>
      <Text style={codeText}>{token}</Text>
    </Section>
    <Text style={{ ...p, fontSize: '13px' }}>
      This code expires in 60 minutes. If you didn't create an account, you can
      safely ignore this email.
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
