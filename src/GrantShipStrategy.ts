import { GrantShipStrategyContract } from 'generated';
import {
  ContentSchema,
  GameStatus,
  GrantStatus,
  Player,
  UpdateScope,
} from './utils/constants';
import {
  _applicationId,
  _grantId,
  _milestoneId,
  _milestoneSetId,
} from './utils/id';
import { invokeActionByRoleType } from './utils/post';
import { addTransaction } from './utils/sync';
import { inWeiMarker } from './utils/feed';

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

  // doesn't need to be added to the transaction table
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
    { loadCurrentApplication: {} }
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
  const currentApplication = grant
    ? context.Grant.getCurrentApplication(grant)
    : null;

  const applicationIndex = currentApplication
    ? currentApplication.index + 1
    : 0;

  const applicationId = _applicationId({
    projectId: project.id,
    shipSrc: event.srcAddress,
    index: applicationIndex,
  });

  context.RawMetadata.set({
    id: event.params.metadata[1],
    protocol: event.params.metadata[0],
    pointer: event.params.metadata[1],
  });

  context.Application.set({
    id: applicationId,
    index: applicationIndex,
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
    lastUpdated: event.blockTimestamp,
    amount: event.params.grantAmount,
    isAllocated: false,
    grantCompleted: false,
    applicationApproved: false,
    currentApplication_id: applicationId,
    currentMilestones_id: undefined,
  });

  addTransaction(event, context.Transaction.set);
});

GrantShipStrategyContract.UpdatePosted.loader(({ event, context }) => {
  const [, , potentialProjectId] = event.params.tag.split(':');
  context.ShipContext.load(event.srcAddress, {
    loadGrantShip: {},
    loadGameManager: {},
  });

  context.Project.load(event.params.recipientId, {});
  context.Grant.load(
    _grantId({
      projectId: potentialProjectId || event.params.recipientId,
      shipSrc: event.srcAddress,
    }),
    { loadCurrentApplication: {} }
  );
});

GrantShipStrategyContract.UpdatePosted.handler(({ event, context }) => {
  if (event.params.tag.startsWith('TAG')) {
    invokeActionByRoleType({ event, context });
  } else {
    context.log.warn(`Tag not found: ${event.params.tag}`);
  }
});

GrantShipStrategyContract.MilestonesSet.loader(({ event, context }) => {
  context.Grant.load(
    _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    }),
    { loadShip: {}, loadProject: {}, loadCurrentMilestones: {} }
  );
});
GrantShipStrategyContract.MilestonesSet.handler(({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });
  const grant = context.Grant.get(grantId);
  const project = grant ? context.Grant.getProject(grant) : null;

  if (!grant || !project) {
    context.log.error(`Grant, Project, or Ship not found: Grant Id ${grantId}`);
    return;
  }

  const currentMilestones = context.Grant.getCurrentMilestones(grant);

  const setIndex = currentMilestones ? currentMilestones.index + 1 : 0;

  const milestoneSetId = _milestoneSetId({
    projectId: project.id,
    shipSrc: event.srcAddress,
    index: setIndex,
  });

  context.MilestoneSet.set({
    id: milestoneSetId,
    index: setIndex,
    grant_id: grantId,
    status: GrantStatus.MilestonesSubmitted,
    timestamp: event.blockTimestamp,
    milestoneLength: event.params.milestones.length,
  });

  for (let i = 0; i < event.params.milestones.length; i++) {
    const milestoneId = _milestoneId({
      projectId: project.id,
      shipSrc: event.srcAddress,
      setIndex,
      index: i,
    });

    const milestone = event.params.milestones[i];
    const metadata = event.params.milestones[i][1];

    context.RawMetadata.set({
      id: metadata[1],
      protocol: metadata[0],
      pointer: metadata[1],
    });

    context.Milestone.set({
      id: milestoneId,
      percentage: milestone[0],
      metadata_id: metadata[1],
      milestoneSet_id: milestoneSetId,
      status: GameStatus.None,
      grant_id: grantId,
    });
  }

  context.Grant.set({
    ...grant,
    currentMilestones_id: milestoneSetId,
    lastUpdated: event.blockTimestamp,
  });

  addTransaction(event, context.Transaction.set);
});

GrantShipStrategyContract.MilestonesReviewed.loader(({ event, context }) => {
  context.Grant.load(
    _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    }),
    {
      loadCurrentMilestones: {},
      loadProject: {},
      loadShip: {},
      loadGameManager: {},
    }
  );
});
GrantShipStrategyContract.MilestonesReviewed.handler(({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });
  const grant = context.Grant.get(grantId);
  const currentMilestones = grant
    ? context.Grant.getCurrentMilestones(grant)
    : null;
  const ship = grant ? context.Grant.getShip(grant) : null;
  const project = grant ? context.Grant.getProject(grant) : null;

  if (!grant || !currentMilestones || !ship || !project) {
    context.log.error(
      `Grant or Current Milestones or Ship or Project not found: Grant Id ${grantId}`
    );
    return;
  }

  const isApproved = event.params.status === 2n;

  context.RawMetadata.set({
    id: event.params.reason[1],
    protocol: event.params.reason[0],
    pointer: event.params.reason[1],
  });

  context.MilestoneSet.set({
    ...currentMilestones,
    status: isApproved ? GameStatus.Accepted : GameStatus.Rejected,
  });

  context.Grant.set({
    ...grant,
    lastUpdated: event.blockTimestamp,
    status: isApproved
      ? GrantStatus.MilestonesApproved
      : GrantStatus.MilestonesRejected,
  });

  context.Update.set({
    id: `grant-update-${event.transactionHash}`,
    scope: UpdateScope.Grant,
    tag: 'grant/milestones/',
    playerType: Player.Ship,
    domain_id: grant.gameManager_id,
    entityAddress: ship.id,
    entityMetadata_id: ship.profileMetadata_id,
    postedBy: event.txOrigin,
    message: `${ship.name} has ${isApproved ? 'approved' : 'not approved'} ${project.name}'s Milestones Draft`,
    content_id: event.params.reason[1],
    contentSchema: ContentSchema.BasicUpdate,
    postDecorator: undefined,
    timestamp: event.blockTimestamp,
    postBlockNumber: event.blockNumber,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });
});

GrantShipStrategyContract.RecipientStatusChanged.loader(
  ({ event, context }) => {
    context.Grant.load(
      _grantId({
        projectId: event.params.recipientId,
        shipSrc: event.srcAddress,
      }),
      { loadProject: {}, loadShip: {}, loadGameManager: {} }
    );
  }
);

GrantShipStrategyContract.RecipientStatusChanged.handler(
  ({ event, context }) => {
    const grantId = _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    });
    const grant = context.Grant.get(grantId);
    const ship = grant ? context.Grant.getShip(grant) : null;
    const project = grant ? context.Grant.getProject(grant) : null;
    const gameManager = grant ? context.Grant.getGameManager(grant) : null;

    if (!grant || !ship || !project || !gameManager) {
      context.log.error(
        `Grant, Ship, Project, or GameManager not found: ${grantId}`
      );
      return;
    }

    const isApproved = event.params.status === 2n;

    context.Grant.set({
      ...grant,
      status: isApproved
        ? GrantStatus.Allocated
        : GrantStatus.FacilitatorRejected,
    });

    context.RawMetadata.set({
      id: event.params.reason[1],
      protocol: event.params.reason[0],
      pointer: event.params.reason[1],
    });

    context.Update.set({
      id: `grant-update-${event.transactionHash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/allocated',
      message: `Facilitators have ${isApproved ? 'approved' : 'not approved'} ${project.name}`,
      playerType: Player.GameFacilitator,
      domain_id: gameManager.id,
      entityAddress: 'facilitators',
      entityMetadata_id: undefined,
      postedBy: event.txOrigin,
      content_id: event.params.reason[1],
      contentSchema: ContentSchema.BasicUpdate,
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grant.id,
    });
  }

  // doesn't need to be added to the transaction table
);

GrantShipStrategyContract.Allocated.loader(({ event, context }) => {
  context.Grant.load(
    _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    }),
    { loadShip: {}, loadGameManager: {}, loadProject: {} }
  );
});
GrantShipStrategyContract.Allocated.handler(({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });
  const grant = context.Grant.get(grantId);
  const ship = grant ? context.Grant.getShip(grant) : null;
  const project = grant ? context.Grant.getProject(grant) : null;
  const gameManager = grant ? context.Grant.getGameManager(grant) : null;

  if (!grant || !ship || !project || !gameManager) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }

  context.Grant.set({
    ...grant,
    isAllocated: true,
    lastUpdated: event.blockTimestamp,
  });

  context.Update.set({
    id: `grant-update-${event.transactionHash}`,
    scope: UpdateScope.Grant,
    tag: 'grant/allocated/ship',
    message: `Grant is locked in! ${ship.name} has allocated ${inWeiMarker(event.params.amount)} to ${project.name}`,
    playerType: Player.Ship,
    domain_id: gameManager.id,
    entityAddress: ship.id,
    entityMetadata_id: ship.profileMetadata_id,
    postedBy: event.txOrigin,
    contentSchema: undefined,
    content_id: undefined,
    postDecorator: undefined,
    timestamp: event.blockTimestamp,
    postBlockNumber: event.blockNumber,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });

  addTransaction(event, context.Transaction.set);
});

GrantShipStrategyContract.MilestoneSubmitted.loader(({ event, context }) => {});
GrantShipStrategyContract.MilestoneSubmitted.handlerAsync(
  async ({ event, context }) => {
    const grantId = _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    });

    const grant = await context.Grant.get(grantId);
    const currentMilestones = grant
      ? await context.Grant.getCurrentMilestones(grant)
      : null;
    const project = grant ? await context.Grant.getProject(grant) : null;

    if (!grant || !currentMilestones || !project) {
      context.log.error(
        `Grant, Current Milestones, or Project not found: ${grantId}`
      );
      return;
    }

    const setIndex = currentMilestones.index;

    const milestone = await context.Milestone.get(
      _milestoneId({
        projectId: event.params.recipientId,
        shipSrc: event.srcAddress,
        setIndex,
        index: Number(event.params.milestoneId),
      })
    );

    if (!milestone) {
      context.log.error(`Milestone not found: ${event.params.milestoneId}`);
      return;
    }

    context.Milestone.set({
      ...milestone,
      status: GameStatus.Pending,
    });

    context.RawMetadata.set({
      id: event.params.metadata[1],
      protocol: event.params.metadata[0],
      pointer: event.params.metadata[1],
    });

    context.Update.set({
      id: `grant-update-${event.transactionHash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/milestone/submit',
      message: `${project.name} has submitted ${event.params.milestoneId + 1n}`,
      playerType: Player.Project,
      domain_id: grant.gameManager_id,
      entityAddress: project.id,
      entityMetadata_id: project.metadata_id,
      postedBy: event.txOrigin,
      contentSchema: ContentSchema.RichText,
      content_id: event.params.metadata[1],
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grant.id,
    });
    addTransaction(event, context.Transaction.set);
  }
);

GrantShipStrategyContract.MilestoneStatusChanged.loader(
  ({ event, context }) => {}
);
GrantShipStrategyContract.MilestoneStatusChanged.handlerAsync(
  async ({ event, context }) => {
    const grantId = _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    });

    const grant = await context.Grant.get(grantId);
    const currentMilestones = grant
      ? await context.Grant.getCurrentMilestones(grant)
      : null;
    const ship = grant ? await context.Grant.getShip(grant) : null;

    if (!grant || !currentMilestones || !ship) {
      context.log.error(`Grant or Current Milestones not found: ${grantId}`);
      return;
    }

    const setIndex = currentMilestones.index;

    const milestone = await context.Milestone.get(
      _milestoneId({
        projectId: event.params.recipientId,
        shipSrc: event.srcAddress,
        setIndex,
        index: Number(event.params.milestoneId),
      })
    );

    if (!milestone) {
      context.log.error(`Milestone not found: ${event.params.milestoneId}`);
      return;
    }

    context.Milestone.set({
      ...milestone,
      status: GameStatus.Accepted,
    });

    context.Update.set({
      id: `grant-update-${event.transactionHash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/milestone/accepted',
      message: `${ship.name} has approved milestone ${event.params.milestoneId + 1n}`,
      playerType: Player.Ship,
      domain_id: grant.gameManager_id,
      entityAddress: ship.id,
      entityMetadata_id: ship.profileMetadata_id,
      postedBy: event.txOrigin,
      contentSchema: undefined,
      content_id: undefined,
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grant.id,
    });
    // doesn't need to be added to the transaction table
  }
);

GrantShipStrategyContract.MilestoneRejected.loader(({ event, context }) => {});

GrantShipStrategyContract.MilestoneRejected.handlerAsync(
  async ({ event, context }) => {
    const grantId = _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    });
    const grant = await context.Grant.get(grantId);

    const currentMilestones = grant
      ? await context.Grant.getCurrentMilestones(grant)
      : null;

    const ship = grant ? await context.Grant.getShip(grant) : null;

    const project = grant ? await context.Grant.getProject(grant) : null;

    if (!grant || !currentMilestones || !ship || !project) {
      context.log.error(
        `Grant, Current Milestones, or Ship not found: ${grantId}`
      );
      return;
    }

    const setIndex = currentMilestones.index;

    const milestone = await context.Milestone.get(
      _milestoneId({
        projectId: event.params.recipientId,
        shipSrc: event.srcAddress,
        setIndex,
        index: Number(event.params.milestoneId),
      })
    );

    if (!milestone) {
      context.log.error(`Milestone not found: ${event.params.milestoneId}`);
      return;
    }

    context.Milestone.set({
      ...milestone,
      status: GameStatus.Rejected,
    });

    context.Update.set({
      id: `grant-update-${event.transactionHash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/milestone/rejected',
      message: `${ship.name} has rejected milestone ${event.params.milestoneId + 1n}`,
      playerType: Player.Ship,
      domain_id: grant.gameManager_id,
      entityAddress: ship.id,
      entityMetadata_id: ship.profileMetadata_id,
      postedBy: event.txOrigin,
      contentSchema: undefined,
      content_id: undefined,
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grant.id,
    });

    addTransaction(event, context.Transaction.set);
  }
);

GrantShipStrategyContract.Distributed.loader(({ event, context }) => {
  context.Grant.load(
    _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    }),
    { loadShip: {}, loadProject: {} }
  );
});
GrantShipStrategyContract.Distributed.handler(({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const grant = context.Grant.get(grantId);
  const ship = grant ? context.Grant.getShip(grant) : null;
  const project = grant ? context.Grant.getProject(grant) : null;

  if (!grant || !ship || !project) {
    context.log.error(`Grant, Ship, or Project not found: ${grantId}`);
    return;
  }

  context.Update.set({
    id: `grant-update-${event.transactionHash}`,
    scope: UpdateScope.Grant,
    tag: 'grant/distributed',
    message: `${ship.name} has distributed ${inWeiMarker(event.params.amount)} to ${project.name} at recipient address ${event.params.recipientAddress}`,
    playerType: Player.System,
    domain_id: grant.gameManager_id,
    entityAddress: 'system',
    entityMetadata_id: undefined,
    postedBy: event.txOrigin,
    contentSchema: undefined,
    content_id: undefined,
    postDecorator: undefined,
    timestamp: event.blockTimestamp,
    postBlockNumber: event.blockNumber,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });
});

GrantShipStrategyContract.GrantComplete.loader(({ event, context }) => {
  context.Grant.load(
    _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    }),
    {}
  );
});

GrantShipStrategyContract.GrantComplete.handler(({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const grant = context.Grant.get(grantId);

  if (!grant) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }

  context.Grant.set({
    ...grant,
    grantCompleted: true,
    lastUpdated: event.blockTimestamp,
  });

  context.Update.set({
    id: `grant-update-${event.transactionHash}`,
    scope: UpdateScope.Grant,
    tag: 'grant/completed',
    message: `Grant has been completed`,
    playerType: Player.System,
    domain_id: grant.gameManager_id,
    entityAddress: 'system',
    entityMetadata_id: undefined,
    postedBy: event.txOrigin,
    contentSchema: undefined,
    content_id: undefined,
    postDecorator: undefined,
    timestamp: event.blockTimestamp,
    postBlockNumber: event.blockNumber,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });

  addTransaction(event, context.Transaction.set);
});
