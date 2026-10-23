import * as Clipboard from 'expo-clipboard'
import { Image } from 'expo-image'
import { useState } from 'react'
import { Linking, View } from 'react-native'

import { describeError } from '@/lib/api/errors'
import type { BoletoInstructions, OrderDetail, PixInstructions } from '@/lib/api/types'
import { formatCountdown, formatDate, formatTime } from '@/lib/format'
import { haptics } from '@/lib/haptics'
import { isValidTaxId, maskTaxId } from '@/lib/tax-id'
import { Button, Card, ErrorState, Icon, InlineLoader, makeStyles, Text, TextField, useStyles, useToast } from '@/ui'
import { fixedColors } from '@/ui/theme/tokens'

import { hasOpenInstructions, paymentFailureMessage, usePaymentInstructions, usePaymentMethods, usePayOrder } from './api'
import { useCountdown } from './use-countdown'

/** Só abre links HTTPS (vêm do Stripe, via nossa API). */
function openSecureUrl(url: string | null) {
  if (url?.startsWith('https://')) void Linking.openURL(url)
}

function useCopy() {
  const toast = useToast()
  return async (value: string, message: string) => {
    await Clipboard.setStringAsync(value)
    void haptics.success()
    toast.show({ tone: 'success', message })
  }
}

/** CPF/CNPJ com máscara e validação imediata. O valor não é salvo no aparelho. */
export function TaxIdField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <TextField
      label="CPF ou CNPJ de quem vai pagar"
      value={value}
      onChangeText={(text) => onChange(maskTaxId(text))}
      keyboardType="number-pad"
      autoComplete="off"
      maxLength={18}
      error={error}
      hint="Exigido pelo Stripe para Pix e boleto. Usado só para gerar o pagamento; não fica salvo."
      testID="tax-id"
    />
  )
}

/** Abaixo disso o contador fica em destaque. */
const PIX_URGENT_MS = 5 * 60_000

/** Contagem regressiva até o Pix vencer; o servidor cancela o pedido quando o prazo acaba. */
function PixCountdown({ remaining, expiresAt }: { remaining: number; expiresAt: string }) {
  const styles = useStyles(styleFactory)
  const urgent = remaining < PIX_URGENT_MS
  return (
    <View
      style={[styles.countdown, urgent && styles.countdownUrgent]}
      accessible
      accessibilityLabel={`Tempo para pagar: ${formatCountdown(remaining)}. Prazo até ${formatTime(expiresAt)}.`}
      testID="pix-countdown"
    >
      <Icon name="time-outline" size={20} color={urgent ? 'warning' : 'text'} />
      <View style={styles.flex}>
        <Text variant="caption" color={urgent ? 'warning' : 'textMuted'}>
          Tempo para pagar · até {formatTime(expiresAt)}
        </Text>
        <Text variant="priceLarge" color={urgent ? 'warning' : 'text'} style={styles.timer}>
          {formatCountdown(remaining)}
        </Text>
      </View>
    </View>
  )
}

export function PixInstructionsCard({ pix }: { pix: PixInstructions }) {
  const styles = useStyles(styleFactory)
  const copy = useCopy()
  const remaining = useCountdown(pix.expiresAt)

  if (remaining === 0) {
    return (
      <Card style={styles.card}>
        <Text variant="headline">O tempo para pagar acabou</Text>
        <View style={styles.row}>
          <InlineLoader />
          <Text variant="body" color="textMuted" style={styles.flex} testID="pix-expired">
            Estamos cancelando o pedido e devolvendo os itens ao estoque. Nenhuma cobrança foi feita.
          </Text>
        </View>
      </Card>
    )
  }

  return (
    <Card style={styles.card}>
      <Text variant="headline">Pague com Pix</Text>
      <PixCountdown remaining={remaining} expiresAt={pix.expiresAt} />
      <Text variant="body" color="textMuted">
        Leia o QR Code no app do seu banco ou copie o código. Se o prazo acabar, o pedido é cancelado e os itens voltam ao estoque.
      </Text>
      <View style={styles.qrFrame}>
        <Image
          source={{ uri: pix.qrCodeImageUrl }}
          style={styles.qr}
          contentFit="contain"
          accessibilityLabel="QR Code do Pix"
          testID="pix-qr"
        />
      </View>
      <Button
        title="Copiar código Pix"
        icon="copy-outline"
        onPress={() => void copy(pix.qrCodeData, 'Código Pix copiado.')}
        fullWidth
        testID="copy-pix"
      />
      {pix.hostedInstructionsUrl ? (
        <Button title="Ver instruções" variant="ghost" size="md" onPress={() => openSecureUrl(pix.hostedInstructionsUrl)} fullWidth />
      ) : null}
      <View style={styles.row}>
        <InlineLoader />
        <Text variant="caption" color="textMuted" style={styles.flex}>
          Aguardando a confirmação do pagamento. Esta tela atualiza sozinha.
        </Text>
      </View>
    </Card>
  )
}

/** Número em blocos de 5 para leitura (a cópia leva só os dígitos). */
const groupDigits = (value: string) => value.replace(/(\d{5})(?=\d)/g, '$1 ')

export function BoletoInstructionsCard({ boleto }: { boleto: BoletoInstructions }) {
  const styles = useStyles(styleFactory)
  const copy = useCopy()
  return (
    <Card style={styles.card}>
      <Text variant="headline">Boleto gerado</Text>
      <Text variant="body" color="textMuted">
        Vencimento: {formatDate(boleto.expiresAt)}. Depois de pago, a confirmação pode levar até 1 dia útil.
      </Text>
      <Text variant="label" selectable style={styles.number} testID="boleto-number">
        {groupDigits(boleto.number)}
      </Text>
      <Button
        title="Copiar código de barras"
        icon="copy-outline"
        onPress={() => void copy(boleto.number, 'Código do boleto copiado.')}
        fullWidth
        testID="copy-boleto"
      />
      {boleto.pdfUrl ? (
        <Button title="Abrir boleto (PDF)" variant="secondary" icon="document-text-outline" onPress={() => openSecureUrl(boleto.pdfUrl)} fullWidth />
      ) : null}
      <Text variant="caption" color="textMuted">
        Boleto emitido não pode ser cancelado. Se não for pago até o vencimento, o pedido é cancelado e os itens voltam ao estoque.
      </Text>
    </Card>
  )
}

/** Gera (ou gera de novo) o Pix/boleto a partir do CPF/CNPJ. */
function GenerateAsyncPayment({ order }: { order: OrderDetail }) {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const pay = usePayOrder()
  const [taxId, setTaxId] = useState('')
  const [touched, setTouched] = useState(false)
  const testMode = usePaymentMethods().data?.testMode ?? false
  const valid = isValidTaxId(taxId, { allowTestIds: testMode })
  const label = order.paymentMethod === 'pix' ? 'Gerar Pix' : 'Gerar boleto'
  const failure = paymentFailureMessage(order)

  return (
    <Card style={styles.card}>
      <Text variant="headline">{order.paymentMethod === 'pix' ? 'Pagamento com Pix' : 'Pagamento com boleto'}</Text>
      {failure ? (
        <Text variant="body" color="danger" testID="payment-failure">
          {failure}
        </Text>
      ) : null}
      <TaxIdField value={taxId} onChange={setTaxId} error={touched && !valid ? 'CPF ou CNPJ inválido.' : undefined} />
      <Button
        title={label}
        loading={pay.isPending}
        onPress={() => {
          setTouched(true)
          if (!valid) return
          pay.mutate(
            { orderId: order.id, taxId },
            { onError: (error) => toast.show({ tone: 'error', message: describeError(error).message }) },
          )
        }}
        fullWidth
        testID="generate-payment"
      />
    </Card>
  )
}

/** Pix/boleto de um pedido pendente: instruções vigentes ou formulário para gerá-las. */
export function AsyncPaymentPanel({ order }: { order: OrderDetail }) {
  const instructions = usePaymentInstructions(order)

  if (!hasOpenInstructions(order)) return <GenerateAsyncPayment order={order} />
  if (instructions.isPending) return <InlineLoader />
  if (instructions.isError || !instructions.data) {
    return <ErrorState error={instructions.error} onRetry={() => void instructions.refetch()} />
  }
  const session = instructions.data
  if (session.method === 'pix') return <PixInstructionsCard pix={session.pix} />
  if (session.method === 'boleto') return <BoletoInstructionsCard boleto={session.boleto} />
  return null
}

const styleFactory = makeStyles((t) => ({
  card: { gap: t.space.sm },
  qrFrame: {
    alignSelf: 'center',
    padding: t.space.sm,
    borderRadius: t.radius.md,
    backgroundColor: fixedColors.qrBackground,
  },
  qr: { width: 208, height: 208 },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
  flex: { flex: 1 },
  number: { letterSpacing: 0.5 },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingVertical: t.space.sm,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
  },
  countdownUrgent: { backgroundColor: t.colors.warningSoft },
  // Dígitos de largura fixa: o contador não "pula" a cada segundo.
  timer: { fontVariant: ['tabular-nums'] },
}))
