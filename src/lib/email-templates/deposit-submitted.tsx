import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, KV, card, h1, p } from './_shared'

interface Props { name?: string; amount?: string; network?: string; address?: string }

const Email = ({ name, amount, network, address }: Props) => (
  <Shell preview={`Deposit received: $${amount ?? '0.00'} pending confirmation`}>
    <Heading style={h1}>Deposit invoice generated</Heading>
    <Text style={p}>Hi {name || 'trader'}, we've generated your deposit invoice. Your balance will update automatically once the transaction is confirmed and approved.</Text>
    <div style={card}>
      <KV label="Amount" value={`$${amount ?? '0.00'}`} />
      <KV label="Network" value={network ?? '—'} />
      <KV label="Deposit address" value={address ?? '—'} />
    </div>
    <Text style={p}>Do not share this address. Payments to any other address won't be credited.</Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Deposit invoice generated',
  displayName: 'Deposit — Submitted',
  previewData: { name: 'Nathan', amount: '250.00', network: 'USDT · Tron (TRC20)', address: 'TDYjkNwL3rDcQCYY2CNtnzHVkDooLdm18P' },
} satisfies TemplateEntry
