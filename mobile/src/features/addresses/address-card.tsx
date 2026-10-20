import { View } from 'react-native'

import type { NewAddress } from '@/lib/api/types'
import { Icon, makeStyles, PressableScale, Text, useStyles } from '@/ui'

export function formatAddressLines(address: NewAddress): string[] {
  return [
    address.addressLine2 ? `${address.addressLine1}, ${address.addressLine2}` : address.addressLine1,
    `${address.city} – ${address.state}, ${address.zipCode}`,
    address.country,
  ]
}

export function AddressSummary({ address }: { address: NewAddress }) {
  return (
    <View>
      <Text variant="bodyStrong">{address.fullName}</Text>
      {formatAddressLines(address).map((line) => (
        <Text key={line} variant="body" color="textMuted">
          {line}
        </Text>
      ))}
    </View>
  )
}

/** Cartão selecionável (radio) usado no checkout. */
export function AddressOption({
  address,
  selected,
  onPress,
}: {
  address: NewAddress
  selected: boolean
  onPress: () => void
}) {
  const styles = useStyles(styleFactory)
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${address.fullName}, ${formatAddressLines(address).join(', ')}`}
      style={[styles.option, selected && styles.selected]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.text}>
        <AddressSummary address={address} />
      </View>
      <Icon name="location-outline" size={18} color="textMuted" />
    </PressableScale>
  )
}

const styleFactory = makeStyles((t) => ({
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.space.sm,
    padding: t.space.md,
    borderRadius: t.radius.lg,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  selected: { borderColor: t.colors.primary },
  text: { flex: 1 },
  radio: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: t.colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: t.radius.pill, backgroundColor: t.colors.primary },
}))
