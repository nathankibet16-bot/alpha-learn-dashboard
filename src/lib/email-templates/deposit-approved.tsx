import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, KV, card, h1, p } from './_shared'

interface Props { name?: string; amount?: string; network?: string }

const Email = ({ amount, network }: Props) => (
  <Shell preview={`Deposit confirmed — $${amount ?? '0.00'} credited`}>
    <Text style={{ ...p, color: '#10b981', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '12px', margin: '0' }}>
      Transaction Notification
    </Text>
    <Heading style={h1}>Deposit Confirmed</Heading>
    <Text style={p}>Account received transfer.</Text>
    <div style={card}>
      <KV label="Amount" value={`$${amount ?? '0.00'}`} />
      <KV label="Network" value={network ?? '—'} />
      <KV label="Status" value="Credited" />
    </div>
    <Text style={p}>Notification confirms receipt of funds. Log in to manage balances.</Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Deposit Confirmed — Funds Credited',
  displayName: 'Deposit — Approved',
  previewData: { name: 'Nathan', amount: '250.00', network: 'USDT · Tron (TRC20)' },
} satisfies TemplateEntry
