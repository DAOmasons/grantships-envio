import { GrantShipStrategyContract } from 'generated';

GrantShipStrategyContract.PoolFunded.loader(({ event, context }) => {
  context.ShipContext.load(event.srcAddress, {
    loadGrantShip: {},
  });
});

GrantShipStrategyContract.PoolFunded.handler(({ event, context }) => {
  const shipContext = context.ShipContext.get(event.srcAddress);

  if (!shipContext) {
    context.log.error(
      `ShipContext not found: Ship address ${event.srcAddress}`
    );
    return;
  }
  const grantShip = context.ShipContext.getGrantShip(shipContext);

  if (!grantShip) {
    context.log.error(`GrantShip not found: Ship address ${event.srcAddress}`);
    return;
  }

  context.GrantShip.set({
    ...grantShip,
    poolFunded: true,
    balance: event.params.amount,
    totalAvailableFunds: grantShip.totalAvailableFunds + event.params.amount,
  });
});

GrantShipStrategyContract.GrantShipInitialized.loader(({ event, context }) => {
  context.ShipContext.load(event.srcAddress, {
    loadGrantShip: {},
  });
});

GrantShipStrategyContract.GrantShipInitialized.handler(({ event, context }) => {
  const shipContext = context.ShipContext.get(event.srcAddress);

  if (!shipContext) {
    context.log.error(
      `ShipContext not found: Ship address ${event.srcAddress}`
    );
    return;
  }
  const grantShip = context.ShipContext.getGrantShip(shipContext);

  if (!grantShip) {
    context.log.error(`GrantShip not found: Ship address ${event.srcAddress}`);
    return;
  }

  context.GrantShip.set({
    ...grantShip,
    poolId: event.params.poolId,
    hatId: event.params.operatorHatId,
    shipContractAddress: event.srcAddress,
    poolActive: true,
  });
});

GrantShipStrategyContract.RecipientRegistered.loader(
  ({ event, context }) => {}
);
GrantShipStrategyContract.RecipientRegistered.handler(
  ({ event, context }) => {}
);

GrantShipStrategyContract.UpdatePosted.loader(({ event, context }) => {});
GrantShipStrategyContract.UpdatePosted.handler(({ event, context }) => {});

GrantShipStrategyContract.MilestonesSet.loader(({ event, context }) => {});
GrantShipStrategyContract.MilestonesSet.handler(({ event, context }) => {});

GrantShipStrategyContract.MilestonesReviewed.loader(({ event, context }) => {});
GrantShipStrategyContract.MilestonesReviewed.handler(
  ({ event, context }) => {}
);

GrantShipStrategyContract.RecipientStatusChanged.loader(
  ({ event, context }) => {}
);

GrantShipStrategyContract.RecipientStatusChanged.handler(
  ({ event, context }) => {}
);

GrantShipStrategyContract.Allocated.loader(({ event, context }) => {});
GrantShipStrategyContract.Allocated.handler(({ event, context }) => {});

GrantShipStrategyContract.MilestoneSubmitted.loader(({ event, context }) => {});
GrantShipStrategyContract.MilestoneSubmitted.handler(
  ({ event, context }) => {}
);

GrantShipStrategyContract.MilestoneStatusChanged.loader(
  ({ event, context }) => {}
);
GrantShipStrategyContract.MilestoneStatusChanged.handler(({}) => {});

GrantShipStrategyContract.Distributed.loader(({ event, context }) => {});
GrantShipStrategyContract.Distributed.handler(({ event, context }) => {});
