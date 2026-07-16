import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, KV, card, h1, p } from './_shared'

interface Props { name?: string; amount?: string; network?: string; wallet?: string }

const Email = ({ amount, network, wallet }: Props) => (
  <Shell preview={`Withdrawal processed — $${amount ?? '0.00'} sent`}>
    <Text style={{ ...p, color: '#10b981', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '12px', margin: '0' }}>
      Transaction Notification
    </Text>
    <Heading style={h1}>Withdrawal Processed</Heading>
    <Text style={p}>Your withdrawal is complete.</Text>
    <div style={card}>
      <KV label="Amount" value={`$${amount ?? '0.00'}`} />
      <KV label="Network" value={network ?? '—'} />
      <KV label="Destination Wallet" value={wallet ?? '—'} />
      <KV label="Status" value="Success" />
    </div>
    <Text style={p}>Your funds are sent to your destination address.</Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Withdrawal Processed — Funds Sent',
  displayName: 'Withdrawal — Completed',
  previewData: { name: 'Nathan', amount: '120.00', network: 'USDT · TRC20', wallet: 'TDYjkNwL3rDcQCYY2CNtnzHVkDooLdm18P' },
} satisfies TemplateEntry
