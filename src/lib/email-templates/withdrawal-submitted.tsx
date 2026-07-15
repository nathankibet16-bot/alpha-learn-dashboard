import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, KV, card, h1, p } from './_shared'

interface Props { name?: string; amount?: string; network?: string; wallet?: string }

const Email = ({ name, amount, network, wallet }: Props) => (
  <Shell preview={`Withdrawal request received: $${amount ?? '0.00'}`}>
    <Heading style={h1}>Withdrawal request received</Heading>
    <Text style={p}>Hi {name || 'trader'}, your withdrawal request is pending admin review and will be processed shortly.</Text>
    <div style={card}>
      <KV label="Amount" value={`$${amount ?? '0.00'}`} />
      <KV label="Network" value={network ?? '—'} />
      <KV label="Destination wallet" value={wallet ?? '—'} />
    </div>
    <Text style={p}>We'll email you again the moment your funds are released.</Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Withdrawal request received',
  displayName: 'Withdrawal — Submitted',
  previewData: { name: 'Nathan', amount: '120.00', network: 'USDT · TRC20', wallet: 'TDYjkNwL3rDcQCYY2CNtnzHVkDooLdm18P' },
} satisfies TemplateEntry
