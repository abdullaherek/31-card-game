import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionBar } from '../components/ActionBar';
import { CenterColumn } from '../components/CenterColumn';
import { DebtStrip } from '../components/DebtStrip';
import { Declare31Button } from '../components/Declare31Button';
import { HandOptions } from '../components/HandOptions';
import { HandOverOverlay } from '../components/HandOverOverlay';
import { LogLine } from '../components/LogLine';
import { OwnHand } from '../components/OwnHand';
import { PauseButton } from '../components/PauseButton';
import { PausedOverlay } from '../components/PausedOverlay';
import { PauseVoteModal } from '../components/PauseVoteModal';
import { RaisePanel } from '../components/RaisePanel';
import { Seat } from '../components/Seat';
import { TurnIndicator } from '../components/TurnIndicator';
import { color, font, layout, tabularNums } from '../theme/tokens';
import type { MasaActions, MasaViewModel } from './masaTypes';

/**
 * Pure presentation: renders whatever MasaViewModel it's given and forwards taps
 * to MasaActions. It never imports game rules — see HANDOFF.md "Motor sözleşmesi".
 */
export function MasaScreen({ vm, actions }: { vm: MasaViewModel; actions: MasaActions }) {
  return (
    <View style={styles.frame}>
      {vm.handOver ? <HandOverOverlay {...vm.handOver} /> : null}
      {vm.pause.isPaused ? <PausedOverlay onResume={actions.onResume} /> : null}
      {vm.pause.vote ? (
        <PauseVoteModal name={vm.pause.vote.askedName} onAnswer={actions.onVoteAnswer} />
      ) : null}

      <View style={styles.headerRow}>
        <Text style={styles.brand}>31</Text>
        <View style={styles.headerRight}>
          <Text style={styles.roomInfo}>
            ODA {vm.roomCode} · EL {vm.handNo}
          </Text>
          <PauseButton onPress={actions.onRequestPause} disabled={vm.pause.isPaused || !!vm.pause.vote} />
        </View>
      </View>
      <View style={styles.hairline} />

      <View style={styles.tableArea}>
        <View style={styles.sideColumn}>
          <Seat {...vm.seats.topLeft} />
          <Seat {...vm.seats.bottomLeft} />
        </View>
        <View style={styles.centerColumnWrap}>
          <CenterColumn {...vm.center} />
        </View>
        <View style={styles.sideColumn}>
          <Seat {...vm.seats.topRight} />
          <Seat {...vm.seats.bottomRight} />
        </View>
      </View>

      <View style={styles.hairline} />

      <View style={styles.bottomStack}>
        <OwnHand cards={vm.own.cards} stack={vm.own.stack} bet={vm.own.bet} isWatching={vm.own.isWatching} />

        {vm.handOptions ? (
          <HandOptions
            options={vm.handOptions.options}
            pick={vm.handOptions.pick}
            onPick={actions.onPickOption}
          />
        ) : null}

        <View style={styles.hairline} />

        {vm.raising ? (
          <RaisePanel
            amount={vm.raiseAmount}
            onChangeAmount={actions.onChangeRaiseAmount}
            onCancel={actions.onCancelRaise}
            onConfirm={actions.onConfirmRaise}
          />
        ) : null}

        {vm.can31 ? <Declare31Button onPress={actions.onDeclare31} /> : null}

        {vm.debt?.visible ? <DebtStrip owed={vm.debt.owed} /> : null}

        <TurnIndicator pct={vm.turn.pct} label={vm.turn.label} />

        <ActionBar
          legalActions={vm.actionBar.legalActions}
          owed={vm.actionBar.owed}
          onAction={(type) => (type === 'RAISE' ? actions.onOpenRaise() : actions.onAction(type))}
        />

        <LogLine text={vm.logLine} />
      </View>
    </View>
  );
}

export function MasaScreenContainer(props: { vm: MasaViewModel; actions: MasaActions }) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      <MasaScreen {...props} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  frame: {
    flex: 1,
    minHeight: layout.deviceHeight,
    backgroundColor: color.bg,
    paddingTop: layout.safeTop,
    paddingBottom: layout.safeBottom,
    paddingHorizontal: layout.paddingHorizontal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    fontFamily: font.headingSemi,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.02 * 20,
    color: color.text,
  },
  roomInfo: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.16 * 12,
    textTransform: 'uppercase',
    color: color.neutral700,
    ...tabularNums,
  },
  hairline: {
    height: 1.5,
    backgroundColor: color.divider,
  },
  tableArea: {
    flex: 1,
    flexDirection: 'row',
    marginVertical: 9,
  },
  sideColumn: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  centerColumnWrap: {
    flex: 1.02,
    alignItems: 'center',
  },
  bottomStack: {
    gap: 8,
  },
});
