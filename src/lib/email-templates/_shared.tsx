import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'

export const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }
export const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
export const brandBar = { display: 'inline-block' as const, padding: '6px 12px', borderRadius: '8px', background: '#10b981', color: '#000000', fontWeight: 700, fontSize: '14px', letterSpacing: '0.05em' }
export const h1 = { fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '20px 0 8px' }
export const p = { fontSize: '15px', lineHeight: '22px', color: '#334155', margin: '8px 0' }
export const card = { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', margin: '18px 0', background: '#f8fafc' }
export const row = { display: 'flex', justifyContent: 'space-between' as const, padding: '4px 0', fontSize: '14px', color: '#0f172a' }
export const muted = { fontSize: '12px', color: '#64748b', margin: '18px 0 0' }

export function Shell({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <span style={brandBar}>ALPHA TRADER GROUP</span>
          {children}
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0 8px' }} />
          <Text style={muted}>You received this email because of activity on your Alpha Trader Group account.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export function KV({ label, value }: { label: string; value: string }) {
  return (
    <Section style={{ padding: '4px 0' }}>
      <Text style={{ ...p, margin: 0, color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Text>
      <Text style={{ ...p, margin: '2px 0 0', fontWeight: 600 }}>{value}</Text>
    </Section>
  )
}
