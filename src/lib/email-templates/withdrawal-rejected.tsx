import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, KV, card, h1, p } from './_shared'

interface Props { name?: string; amount?: string; network?: string }

const Email = ({ name, amount, network }: Props) => (
  <Shell preview={`Withdrawal request declined`}>
    <Heading style={h1}>Withdrawal request declined</Heading>
    <Text style={p}>Hi {name || 'trader'}, unfortunately your recent withdrawal request could not be processed. No funds were deducted from your balance.</Text>
    <div style={card}>
      <KV label="Requested amount" value={`$${amount ?? '0.00'}`} />
      <KV label="Network" value={network ?? '—'} />
    </div>
    <Text style={p}>If you believe this was a mistake, please contact support from within your dashboard.</Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Withdrawal request declined',
  displayName: 'Withdrawal — Rejected',
  previewData: { name: 'Nathan', amount: '120.00', network: 'USDT · TRC20' },
} satisfies TemplateEntry
