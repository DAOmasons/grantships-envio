import { ScaffoldDaoShamanContract } from 'generated';
import { addTransaction } from './utils/sync';

ScaffoldDaoShamanContract.Initialized.loader(({ event, context }) => {});

ScaffoldDaoShamanContract.Initialized.handler(({ event, context }) => {
  console.log('ScaffoldDaoShamanContract.Initialized.handler');

  context.DAOToken.set({
    id: event.params.lootTokenAddress,
    address: event.params.lootTokenAddress,
    symbol: event.params.lootTokenSymbol,
    shaman_id: event.srcAddress,
    dao: event.params.dao,
  });

  context.DAOToken.set({
    id: event.params.sharesTokenAddress,
    address: event.params.sharesTokenAddress,
    symbol: event.params.sharesTokenSymbol,
    shaman_id: event.srcAddress,
    dao: event.params.dao,
  });

  context.ScaffoldShaman.set({
    id: event.srcAddress,
    address: event.srcAddress,
    managerGate_id: `gate-${event.srcAddress}-0`,
    minterGate_id: `gate-${event.srcAddress}-1`,
    controlGate_id: `gate-${event.srcAddress}-2`,
    dao: event.params.dao,
    lootToken_id: event.params.lootTokenAddress,
    sharesToken_id: event.params.sharesTokenAddress,
  });

  addTransaction(event, context.Transaction.set);
});

ScaffoldDaoShamanContract.BadgeSaved.loader(({ event, context }) => {
  //   context.BadgeTemplate.load(`${event.srcAddress}-${event.params.badgeId}`, {});
  context.ScaffoldShaman.load(event.srcAddress, {});
});

ScaffoldDaoShamanContract.BadgeSaved.handler(({ event, context }) => {
  const shaman = context.ScaffoldShaman.get(event.srcAddress);

  if (!shaman) {
    context.log.error(
      `Scaffold Shaman not found for address ${event.srcAddress}`
    );
    return;
  }

  context.RawMetadata.set({
    id: event.params.metadata[1],
    protocol: event.params.metadata[0],
    pointer: event.params.metadata[1],
  });

  context.BadgeTemplate.set({
    id: `${event.srcAddress}-${event.params.badgeId}`,
    badgeId: event.params.badgeId,
    name: event.params.name,
    metadata_id: event.params.metadata[1],
    amount: event.params.amount,
    isVotingToken: event.params.isVotingToken,
    hasFixedAmount: event.params.hasFixedAmount,
    isSlash: event.params.isSlash,
    shaman_id: event.srcAddress,
    exists: true,
    dao: shaman.dao,
  });

  addTransaction(event, context.Transaction.set);
});

ScaffoldDaoShamanContract.BadgeRemoved.loader(({ event, context }) => {
  context.BadgeTemplate.load(`${event.srcAddress}-${event.params.badgeId}`, {});
});

ScaffoldDaoShamanContract.BadgeRemoved.handler(({ event, context }) => {
  const badge = context.BadgeTemplate.get(
    `${event.srcAddress}-${event.params.badgeId}`
  );
  if (!badge) {
    context.log.error(
      `Badge not found for address ${event.srcAddress} Badge id ${event.params.badgeId}`
    );
    return;
  }

  context.BadgeTemplate.set({
    ...badge,
    exists: false,
  });

  addTransaction(event, context.Transaction.set);
});

ScaffoldDaoShamanContract.BadgeAssigned.loader(({ event, context }) => {
  context.ScaffoldShaman.load(event.srcAddress, {});
  context.BadgeTemplate.load(`${event.srcAddress}-${event.params.badgeId}`, {});
  context.BadgeHolder.load(`${event.srcAddress}-${event.params.recipient}`, {});
});

ScaffoldDaoShamanContract.BadgeAssigned.handler(({ event, context }) => {
  const shaman = context.ScaffoldShaman.get(event.srcAddress);
  const BadgeTemplate = context.BadgeTemplate.get(
    `${event.srcAddress}-${event.params.badgeId}`
  );
  const badgeHolder = context.BadgeHolder.get(
    `${event.srcAddress}-${event.params.recipient}`
  );

  if (!shaman || !BadgeTemplate) {
    context.log.error(
      `Scaffold Shaman or BadgeTemplate or BadgeHolder not found for address ${event.srcAddress}`
    );
    return;
  }

  context.RawMetadata.set({
    id: event.params.metadata[1],
    protocol: event.params.metadata[0],
    pointer: event.params.metadata[1],
  });

  context.Badge.set({
    id: `${event.srcAddress}-${event.params.recipient}-${event.params.badgeId}`,
    template_id: `${event.srcAddress}-${event.params.badgeId}`,
    amount: event.params.amount,
    reason_id: event.params.metadata[1],
    wearer_id: `${event.srcAddress}-${event.params.recipient}`,
    dao: shaman.dao,
  });

  if (!badgeHolder) {
    context.BadgeHolder.set({
      id: `${event.srcAddress}-${event.params.recipient}`,
      address: event.params.recipient,
      dao: shaman.dao,
      shaman_id: event.srcAddress,
      badgeBalance: BadgeTemplate.isSlash ? 0n : event.params.amount,
    });
  } else {
    context.BadgeHolder.set({
      ...badgeHolder,
      badgeBalance: BadgeTemplate.isSlash
        ? // we check underflow on the contract side
          badgeHolder.badgeBalance - event.params.amount
        : badgeHolder.badgeBalance + event.params.amount,
    });
  }

  addTransaction(event, context.Transaction.set);
});

ScaffoldDaoShamanContract.GateUpdated.loader(({ event, context }) => {
  context.Gate.load(`gate-${event.srcAddress}-${event.params.gateIndex}`);
});

ScaffoldDaoShamanContract.GateUpdated.handler(({ event, context }) => {
  context.Gate.set({
    id: `gate-${event.srcAddress}-${event.params.gateIndex}`,
    gateId: Number(event.params.gateIndex),
    gateType: Number(event.params.gateType),
    hatId: event.params.hatId,
  });

  addTransaction(event, context.Transaction.set);
});
