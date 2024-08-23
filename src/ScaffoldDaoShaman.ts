import { ScaffoldDaoShamanContract } from 'generated';

ScaffoldDaoShamanContract.Initialized.loader(({ event }) => {});

ScaffoldDaoShamanContract.Initialized.handler(({ event, context }) => {
  const managerGate = event.params._0[0];
  const managerGateEntityId = `gate-${event.srcAddress}-${0}`;
  const managerGateType = managerGate[0];
  const managerGateHatId = managerGate[1];

  const minterGate = event.params._0[1];
  const minterGateEntityId = `gate-${event.srcAddress}-${1}`;
  const minterGateType = minterGate[0];
  const minterGateHatId = minterGate[1];

  const controlGate = event.params._0[2];
  const controlGateEntityId = `gate-${event.srcAddress}-${2}`;
  const controlGateType = controlGate[0];
  const controlGateHatId = controlGate[1];

  context.Gate.set({
    id: managerGateEntityId,
    gateId: 0,
    gateType: Number(managerGateType),
    hatId: managerGateHatId,
  });

  context.Gate.set({
    id: minterGateEntityId,
    gateId: 1,
    gateType: Number(minterGateType),
    hatId: minterGateHatId,
  });

  context.Gate.set({
    id: controlGateEntityId,
    gateId: 2,
    gateType: Number(controlGateType),
    hatId: controlGateHatId,
  });

  context.ScaffoldShaman.set({
    id: event.srcAddress,
    address: event.srcAddress,
    managerGate_id: managerGateEntityId,
    minterGate_id: minterGateEntityId,
    controlGate_id: controlGateEntityId,
    dao: event.params.dao,
  });
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
});

ScaffoldDaoShamanContract.BadgeAssigned.loader(({ event }) => {});

ScaffoldDaoShamanContract.BadgeAssigned.handler(({ event, context }) => {});
