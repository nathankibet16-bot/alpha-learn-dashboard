import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  token: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code is {token}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Enter the 6-digit verification code below on the confirmation screen
          to finish creating your account
          {recipient ? (
            <>
              {' '}for{' '}
              <Link href={`mailto:${recipient}`} style={link}>
                {recipient}
              </Link>
            </>
          ) : null}
          .
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{token}</Text>
        </Section>
        <Text style={helper}>
          This code expires in 60 minutes. If you didn't create an account, you
          can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const codeBox = {
  backgroundColor: '#0f1115',
  borderRadius: '10px',
  padding: '18px 24px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const codeText = {
  color: '#10b981',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  margin: 0,
  fontFamily: 'monospace',
}
const helper = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
