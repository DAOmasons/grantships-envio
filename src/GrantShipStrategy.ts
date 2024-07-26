import { GrantShipStrategyContract } from 'generated';
import { FacilitatorApprovalStatus, GrantStatus } from './utils/constants';

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
    hatId: event.params.operatorHatId.toString(),
    shipContractAddress: event.srcAddress,
    poolActive: true,
  });
});

GrantShipStrategyContract.RecipientRegistered.loader(({ event, context }) => {
  context.ShipContext.load(event.srcAddress, {
    loadGrantShip: {},
    loadGameManager: {},
  });
  context.Project.load(event.params.recipientId, {});
  context.Grant.load(
    `grant-${event.srcAddress}-${event.params.recipientId}`,
    {}
  );
});
GrantShipStrategyContract.RecipientRegistered.handler(({ event, context }) => {
  const shipContext = context.ShipContext.get(event.srcAddress);
  const project = context.Project.get(event.params.recipientId);

  if (!shipContext || !project) {
    context.log.error(
      `ShipContext or Project not found: Ship address ${event.srcAddress} Project address ${event.params.recipientId}`
    );
    return;
  }
  const grantShip = context.ShipContext.getGrantShip(shipContext);
  const gameManager = context.ShipContext.getGameManager(shipContext);

  if (!grantShip || !gameManager) {
    context.log.error(
      `GrantShip or GameManager not found: Ship address ${event.srcAddress}`
    );
    return;
  }

  context.Grant.set({
    id: `grant-${event.srcAddress}-${event.params.recipientId}`,
    ship_id: grantShip.id,
    project_id: project.id,
    gameManager_id: gameManager.id,
    status: GrantStatus.ApplicationSubmitted,
    lastUpdated: event.blockTimestamp,
    amount: undefined,
    facilitatorApprovalStatus: FacilitatorApprovalStatus.None,
    hasPendingMilestones: false,
    hasRejectedMilestones: false,
    allApproved: false,
    grantCompleted: false,
    applicationApproved: false,
    approvedMilestones_id: undefined,
    approvedApplication_id: undefined,
  });
});

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
