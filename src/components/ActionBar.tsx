import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Action } from '../game/bettingEngine';
import { Button, ButtonVariant } from './Button';

type ActionType = Action['type'];

interface ActionSpec {
  type: ActionType;
  label: string;
  variant: ButtonVariant;
  flex: number;
}

function lockedReason(type: ActionType, owed: number): string | undefined {
  if (owed > 0) return 'önce borcunu görmelisin';
  if (type === 'DRAW_CLOSED') return 'önce vurmalısın';
  if (type === 'RAISE') return 'bu turda zaten vurdun — geç ya da kapalı çek';
  return 'bu aksiyon şu anda kilitli';
}

/**
 * The single source of truth for what's tappable is `legalActions` — nothing here
 * re-derives game rules. Locked buttons stay visible and disabled, never hidden,
 * per HANDOFF.md ("kilitli görünür").
 */
export function ActionBar({
  legalActions,
  owed,
  onAction,
}: {
  legalActions: ActionType[];
  owed: number;
  onAction: (type: ActionType) => void;
}) {
  const specs: ActionSpec[] = [
    { type: 'CALL', label: owed > 0 ? `Gör ${owed}` : 'Gör', variant: 'primary', flex: 1.1 },
    { type: 'DRAW_OPEN', label: 'Aç', variant: 'secondary', flex: 0.8 },
    { type: 'RAISE', label: 'Vur', variant: 'primary', flex: 0.9 },
    { type: 'DRAW_CLOSED', label: 'Kapalı çek', variant: 'primary', flex: 1.3 },
    { type: 'PASS', label: 'Geç', variant: 'secondary', flex: 0.8 },
    { type: 'FOLD', label: 'Kaç', variant: 'ghost', flex: 0.8 },
  ];

  return (
    <View style={styles.row}>
      {specs.map((s) => {
        const enabled = legalActions.includes(s.type);
        return (
          <View key={s.type} style={{ flex: s.flex }}>
            <Button
              label={s.label}
              variant={s.variant}
              disabled={!enabled}
              onPress={() => onAction(s.type)}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
              accessibilityHint={!enabled ? lockedReason(s.type, owed) : undefined}
              style={styles.button}
              textStyle={styles.label}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 0,
    width: '100%',
  },
  label: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: 0.04 * 14.5,
  },
});
