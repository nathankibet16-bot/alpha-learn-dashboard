import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, KV, card, h1, p } from './_shared'

interface Props { name?: string; amount?: string; network?: string }

const Email = ({ name, amount, network }: Props) => (
  <Shell preview={`Your deposit of $${amount ?? '0.00'} was approved`}>
    <Heading style={h1}>Deposit approved ✓</Heading>
    <Text style={p}>Great news {name || 'trader'} — your deposit has been confirmed and credited to your account balance.</Text>
    <div style={card}>
      <KV label="Amount credited" value={`$${amount ?? '0.00'}`} />
      <KV label="Network" value={network ?? '—'} />
    </div>
    <Text style={p}>You can now activate the AI Trading Bot or continue trading from your dashboard.</Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Deposit approved — balance credited',
  displayName: 'Deposit — Approved',
  previewData: { name: 'Nathan', amount: '250.00', network: 'USDT · Tron (TRC20)' },
} satisfies TemplateEntry
