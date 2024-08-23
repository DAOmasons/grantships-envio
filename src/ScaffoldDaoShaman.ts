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

ScaffoldDaoShamanContract.BadgeSaved.loader(({ event }) => {});

ScaffoldDaoShamanContract.BadgeSaved.handler(({ event, context }) => {});

ScaffoldDaoShamanContract.BadgeRemoved.loader(({ event }) => {});

ScaffoldDaoShamanContract.BadgeRemoved.handler(({ event, context }) => {});

ScaffoldDaoShamanContract.BadgeAssigned.loader(({ event }) => {});

ScaffoldDaoShamanContract.BadgeAssigned.handler(({ event, context }) => {});
