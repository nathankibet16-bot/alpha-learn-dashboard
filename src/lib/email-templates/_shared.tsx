import * as React from 'react'
import { Body, Container, Head, Html, Preview, Section, Text, Hr, Button as REButton } from '@react-email/components'

// Outer Body must remain #ffffff (email client requirement). The inner
// panel carries the dark black/green Alpha Trader Group brand.
export const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, Helvetica, sans-serif', margin: 0, padding: '24px 0' }
export const container = { maxWidth: '600px', margin: '0 auto', padding: '0' }
export const panel = { background: '#0a0a0a', borderRadius: '16px', padding: '36px 32px', border: '1px solid #1a1f1a' }
export const brandBar = { display: 'inline-block' as const, padding: '8px 14px', borderRadius: '999px', background: '#10b981', color: '#000000', fontWeight: 700, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase' as const }
export const h1 = { fontSize: '26px', fontWeight: 700, color: '#ffffff', margin: '22px 0 10px', lineHeight: '1.25' }
export const p = { fontSize: '15px', lineHeight: '24px', color: '#cbd5d1', margin: '10px 0' }
export const card = { border: '1px solid #1f2a24', borderRadius: '12px', padding: '18px 20px', margin: '20px 0', background: '#0f1512' }
export const muted = { fontSize: '12px', color: '#6b7a72', margin: '18px 0 0', lineHeight: '18px' }
export const accent = { color: '#10b981', fontWeight: 600 }

export const button = {
  backgroundColor: '#10b981',
  color: '#000000',
  fontSize: '15px',
  fontWeight: 700,
  borderRadius: '10px',
  padding: '13px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}

export function Shell({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={panel}>
            <span style={brandBar}>Alpha Traders</span>
            {children}
            <Hr style={{ borderColor: '#1f2a24', margin: '26px 0 12px' }} />
            <Text style={muted}>You received this email because of activity on your Alpha Traders account. If this wasn't you, you can ignore this message.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function KV({ label, value }: { label: string; value: string }) {
  return (
    <Section style={{ padding: '6px 0' }}>
      <Text style={{ margin: 0, color: '#6b7a72', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 600 }}>{label}</Text>
      <Text style={{ margin: '3px 0 0', color: '#ffffff', fontSize: '15px', fontWeight: 600, wordBreak: 'break-all' as const }}>{value}</Text>
    </Section>
  )
}

export function CTA({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ padding: '10px 0 4px' }}>
      <REButton style={button} href={href}>{label}</REButton>
    </Section>
  )
}
