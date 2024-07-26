import {
  GrantShipStrategyContract,
  GrantShipStrategyContract_UpdatePostedEvent_applicationEntityHandlerContext,
  GrantShipStrategyContract_UpdatePostedEvent_eventArgs,
  GrantShipStrategyContract_UpdatePostedEvent_eventPostEntityHandlerContext,
  GrantShipStrategyContract_UpdatePostedEvent_handlerContext,
  eventLog,
} from 'generated';
import { FacilitatorApprovalStatus, GrantStatus } from './utils/constants';
import { _applicationId, _grantId } from './utils/id';
import { invokeActionByRoleType } from './utils/post';

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
    _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    }),
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
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  if (!grantShip || !gameManager) {
    context.log.error(
      `GrantShip or GameManager not found: Ship address ${event.srcAddress}`
    );
    return;
  }
  const grant = context.Grant.get(grantId);

  if (!grant) {
    context.RawMetadata.set({
      id: event.params.metadata[1],
      protocol: event.params.metadata[0],
      pointer: event.params.metadata[1],
    });

    context.Application.set({
      id: _applicationId({
        projectId: project.id,
        shipSrc: event.srcAddress,
        index: 0,
      }),
      grant_id: grantId,
      metadata_id: event.params.metadata[1],
      amount: event.params.grantAmount,
      receivingAddress: event.params.receivingAddress,
      status: GrantStatus.ApplicationSubmitted,
      timestamp: event.blockTimestamp,
    });

    context.Grant.set({
      id: grantId,
      ship_id: grantShip.id,
      project_id: project.id,
      gameManager_id: gameManager.id,
      status: GrantStatus.ApplicationSubmitted,
      applicationIndex: 0,
      lastUpdated: event.blockTimestamp,
      amount: event.params.grantAmount,
      facilitatorApprovalStatus: FacilitatorApprovalStatus.None,
      hasPendingMilestones: false,
      hasRejectedMilestones: false,
      allApproved: false,
      grantCompleted: false,
      applicationApproved: false,
      approvedMilestones_id: undefined,
      approvedApplication_id: undefined,
    });
  } else {
    context.RawMetadata.set({
      id: event.params.metadata[1],
      protocol: event.params.metadata[0],
      pointer: event.params.metadata[1],
    });

    context.Application.set({
      id: _applicationId({
        projectId: project.id,
        shipSrc: event.srcAddress,
        index: grant.applicationIndex + 1,
      }),
      grant_id: grantId,
      metadata_id: event.params.metadata[1],
      amount: event.params.grantAmount,
      receivingAddress: event.params.receivingAddress,
      status: GrantStatus.ApplicationSubmitted,
      timestamp: event.blockTimestamp,
    });
    context.Grant.set({
      id: grantId,
      ship_id: grantShip.id,
      project_id: project.id,
      gameManager_id: gameManager.id,
      status: GrantStatus.ApplicationSubmitted,
      applicationIndex: grant.applicationIndex + 1,
      lastUpdated: event.blockTimestamp,
      amount: event.params.grantAmount,
      facilitatorApprovalStatus: FacilitatorApprovalStatus.None,
      hasPendingMilestones: false,
      hasRejectedMilestones: false,
      allApproved: false,
      grantCompleted: false,
      applicationApproved: false,
      approvedMilestones_id: undefined,
      approvedApplication_id: undefined,
    });
  }
});

GrantShipStrategyContract.UpdatePosted.loader(({ event, context }) => {
  context.ShipContext.load(event.srcAddress, {
    loadGrantShip: {},
    loadGameManager: {},
  });
  context.Project.load(event.params.recipientId, {});
  context.Grant.load(
    _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    }),
    {}
  );
});

GrantShipStrategyContract.UpdatePosted.handler(async ({ event, context }) => {
  if (event.params.tag.startsWith('TAG')) {
    invokeActionByRoleType({ event, context });
  } else {
    context.log.warn(`Tag not found: ${event.params.tag}`);
  }
});

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
