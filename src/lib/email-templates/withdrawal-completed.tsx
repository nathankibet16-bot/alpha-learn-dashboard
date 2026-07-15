import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, KV, card, h1, p } from './_shared'

interface Props { name?: string; amount?: string; network?: string; wallet?: string }

const Email = ({ name, amount, network, wallet }: Props) => (
  <Shell preview={`Withdrawal of $${amount ?? '0.00'} completed`}>
    <Heading style={h1}>Withdrawal completed ✓</Heading>
    <Text style={p}>Hi {name || 'trader'} — your funds are on the way. The transfer has been released to your destination wallet.</Text>
    <div style={card}>
      <KV label="Amount" value={`$${amount ?? '0.00'}`} />
      <KV label="Network" value={network ?? '—'} />
      <KV label="Destination wallet" value={wallet ?? '—'} />
    </div>
    <Text style={p}>Depending on network congestion, funds typically arrive within minutes.</Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Withdrawal completed',
  displayName: 'Withdrawal — Completed',
  previewData: { name: 'Nathan', amount: '120.00', network: 'USDT · TRC20', wallet: 'TDYjkNwL3rDcQCYY2CNtnzHVkDooLdm18P' },
} satisfies TemplateEntry
