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
import { addFeedCard, inWeiMarker } from './utils/feed';

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
    totalFundsReceived: grantShip.totalFundsReceived + event.params.amount,
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
    status: GameStatus.Pending,
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
    amountAllocated: 0n,
    amountDistributed: 0n,
    isAllocated: false,
    grantCompleted: false,
    applicationApproved: false,
    hasPendingMilestones: false,
    hasRejectedMilestones: false,
    allMilestonesApproved: false,
    currentApplication_id: applicationId,
    currentMilestones_id: undefined,
  });

  addFeedCard({
    message: `${project.name} has submitted a grant application to ${grantShip.name}`,
    tag: 'grant/application',
    domain: gameManager.id,
    subject: {
      id: project.id,
      playerType: Player.Project,
      name: project.name,
      pointer: project.metadata_id,
    },
    object: {
      id: grantShip.id,
      playerType: Player.Ship,
      name: grantShip.name,
    },
    setEntity: context.FeedItemEntity.set,
    event,
    setCard: context.FeedCard.set,
    setEmbed: context.FeedItemEmbed.set,
    setMetadata: context.RawMetadata.set,
    internalLink: `/grant/${grantId}/application`,
  });

  addTransaction(event, context.Transaction.set);
});

GrantShipStrategyContract.UpdatePosted.loader(({ event, context }) => {
  const [, , potentialProjectId] = event.params.tag.split(':');
  context.ShipContext.load(event.srcAddress, {
    loadGrantShip: {},
    loadGameManager: {},
  });

  context.Project.load(potentialProjectId || event.params.recipientId, {});
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
  const ship = grant ? context.Grant.getShip(grant) : null;

  if (!grant || !project || !ship) {
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
    status: GameStatus.Pending,
    timestamp: event.blockTimestamp,
    milestoneLength: event.params.milestones.length,
    milestonesCompleted: 0,
    milestonesRejected: 0,
    milestonesPending: 0,
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
      index: i,
      metadata_id: metadata[1],
      milestoneSet_id: milestoneSetId,
      status: GameStatus.None,
      grant_id: grantId,
    });
  }

  context.Grant.set({
    ...grant,
    status: GrantStatus.MilestonesSubmitted,
    currentMilestones_id: milestoneSetId,
    lastUpdated: event.blockTimestamp,
  });

  addFeedCard({
    message: `${project.name} has submitted a milestone draft to ${ship.name}`,
    tag: 'grant/application',
    domain: ship.gameManager_id || 'NEVER',
    subject: {
      id: project.id,
      playerType: Player.Project,
      name: project.name,
      pointer: project.metadata_id,
    },
    object: {
      id: ship.id,
      playerType: Player.Ship,
      name: ship.name,
    },
    setEntity: context.FeedItemEntity.set,
    event,
    setCard: context.FeedCard.set,
    setEmbed: context.FeedItemEmbed.set,
    setMetadata: context.RawMetadata.set,
    internalLink: `/grant/${grantId}/milestones`,
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
    tag: isApproved
      ? 'grant/approve/milestoneSet'
      : 'grant/reject/milestoneSet',
    playerType: Player.Ship,
    domain_id: grant.gameManager_id,
    entityAddress: ship.id,
    entityMetadata_id: ship.profileMetadata_id,
    postedBy: event.txOrigin,
    message: `${ship.name} has ${isApproved ? 'approved' : 'not approved'} ${project.name}'s Milestones Draft`,
    content_id: event.params.reason[1],
    contentSchema: ContentSchema.Reason,
    postDecorator: undefined,
    timestamp: event.blockTimestamp,
    postBlockNumber: event.blockNumber,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });

  addFeedCard({
    message: `${ship.name} ${isApproved ? 'has approved' : 'did not approve'} ${project.name}'s milestones draft`,
    tag: 'grant/milestoneset/review',
    domain: ship.gameManager_id || 'NEVER',
    subject: {
      id: ship.id,
      playerType: Player.Ship,
      name: ship.name,
      pointer: ship.profileMetadata_id,
    },
    object: {
      id: project.id,
      playerType: Player.Project,
      name: project.name,
    },
    embed: {
      key: 'reason',
      pointer: event.params.reason[1],
      protocol: event.params.reason[0],
    },
    setEntity: context.FeedItemEntity.set,
    event,
    setCard: context.FeedCard.set,
    setEmbed: context.FeedItemEmbed.set,
    setMetadata: context.RawMetadata.set,
    internalLink: `/grant/${grantId}/milestones`,
  });

  addTransaction(event, context.Transaction.set);
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
      lastUpdated: event.blockTimestamp,
    });

    context.RawMetadata.set({
      id: event.params.reason[1],
      protocol: event.params.reason[0],
      pointer: event.params.reason[1],
    });

    context.Update.set({
      id: `grant-update-${event.transactionHash}-${event.logIndex}`,
      scope: UpdateScope.Grant,
      tag: isApproved ? 'grant/allocate/approved' : 'grant/allocate/rejected',
      message: `Facilitators have ${isApproved ? 'approved' : 'not approved'} ${project.name}`,
      playerType: Player.GameFacilitator,
      domain_id: gameManager.id,
      entityAddress: 'facilitators',
      entityMetadata_id: undefined,
      postedBy: event.txOrigin,
      content_id: event.params.reason[1],
      contentSchema: ContentSchema.Reason,
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grant.id,
    });

    addFeedCard({
      message: `Facilitators ${isApproved ? 'have approved' : 'did not approve'} ${project.name} for allocation.`,
      tag: 'grant/facilitator/review',
      domain: ship.gameManager_id || 'NEVER',
      subject: {
        id: ship.gameManager_id || 'NEVER',
        playerType: Player.GameFacilitator,
        name: 'Facilitator Crew',
        pointer: 'facilitators',
      },
      object: {
        id: project.id,
        playerType: Player.Project,
        name: project.name,
      },
      embed: {
        key: 'reason',
        pointer: event.params.reason[1],
        protocol: event.params.reason[0],
      },
      setEntity: context.FeedItemEntity.set,
      event,
      setCard: context.FeedCard.set,
      setEmbed: context.FeedItemEmbed.set,
      setMetadata: context.RawMetadata.set,
      internalLink: `/grant/${grantId}`,
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
    amountAllocated: event.params.amount,
    lastUpdated: event.blockTimestamp,
  });

  context.GrantShip.set({
    ...ship,
    totalAllocated: ship.totalAllocated + event.params.amount,
    balance: ship.balance - event.params.amount,
  });

  context.Update.set({
    id: `grant-update-${event.transactionHash}-${event.logIndex}`,
    scope: UpdateScope.Grant,
    tag: 'grant/allocation/locked',
    message: `Grant is locked in! ${ship.name} has allocated ${inWeiMarker(event.params.amount)} to ${project.name}`,
    playerType: Player.System,
    domain_id: gameManager.id,
    entityAddress: ship.id,
    entityMetadata_id: ship.profileMetadata_id,
    postedBy: event.txOrigin,
    contentSchema: undefined,
    content_id: undefined,
    postDecorator: undefined,
    timestamp: event.blockTimestamp + 1,
    postBlockNumber: event.blockNumber,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });

  addFeedCard({
    message: `${ship.name} have allocated ${inWeiMarker(event.params.amount)} to ${project.name}`,
    tag: 'grant/allocated',
    domain: ship.gameManager_id || 'NEVER',
    subject: {
      id: ship.id,
      playerType: Player.Ship,
      name: ship.name,
      pointer: ship.profileMetadata_id,
    },
    object: {
      id: project.id,
      playerType: Player.Project,
      name: project.name,
    },
    setEntity: context.FeedItemEntity.set,
    event,
    setCard: context.FeedCard.set,
    setEmbed: context.FeedItemEmbed.set,
    setMetadata: context.RawMetadata.set,
    internalLink: `/grant/${grantId}`,
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
    const ship = grant ? await context.Grant.getShip(grant) : null;

    if (!grant || !currentMilestones || !project || !ship) {
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

    const isResubmitting = milestone.status === GameStatus.Rejected;
    const newMilestonesRejectedCount = isResubmitting
      ? currentMilestones.milestonesRejected - 1
      : currentMilestones.milestonesRejected;
    const hasRejectedMilestones = newMilestonesRejectedCount > 0;

    context.Grant.set({
      ...grant,
      hasPendingMilestones: true,
      hasRejectedMilestones,
      lastUpdated: event.blockTimestamp,
    });

    context.Milestone.set({
      ...milestone,
      status: GameStatus.Pending,
    });

    context.MilestoneSet.set({
      ...currentMilestones,
      milestonesPending: currentMilestones.milestonesPending + 1,
      milestonesRejected: newMilestonesRejectedCount,
    });

    context.RawMetadata.set({
      id: event.params.metadata[1],
      protocol: event.params.metadata[0],
      pointer: event.params.metadata[1],
    });

    context.Update.set({
      id: `${event.params.milestoneId}:milestone-submit-${event.transactionHash}`,
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

    addFeedCard({
      message: `${project.name} has submitted Milestone ${milestone.index + 1} to ${ship.name}`,
      tag: 'grant/milestone/submit',
      domain: ship.gameManager_id || 'NEVER',
      richTextContent: {
        protocol: event.params.metadata[0],
        pointer: event.params.metadata[1],
      },
      subject: {
        id: project.id,
        playerType: Player.Project,
        name: project.name,
        pointer: project.metadata_id,
      },
      object: {
        id: ship.id,
        playerType: Player.Ship,
        name: ship.name,
      },
      setEntity: context.FeedItemEntity.set,
      event,
      setCard: context.FeedCard.set,
      setEmbed: context.FeedItemEmbed.set,
      setMetadata: context.RawMetadata.set,
      internalLink: `/grant/${grantId}/milestones`,
    });
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
    const project = grant ? await context.Grant.getProject(grant) : null;

    if (!grant || !currentMilestones || !ship || !project) {
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

    const allMilestonesApproved =
      currentMilestones.milestonesCompleted + 1 ===
      currentMilestones.milestoneLength;
    const hasPendingMilestones = currentMilestones.milestonesPending - 1 > 0;

    context.MilestoneSet.set({
      ...currentMilestones,
      milestonesPending: currentMilestones.milestonesPending - 1,
      milestonesCompleted: currentMilestones.milestonesCompleted + 1,
    });

    context.Grant.set({
      ...grant,
      allMilestonesApproved,
      hasPendingMilestones,
      lastUpdated: event.blockTimestamp,
      status: allMilestonesApproved
        ? GrantStatus.AllMilestonesComplete
        : grant.status,
    });

    context.Milestone.set({
      ...milestone,
      status: GameStatus.Accepted,
    });

    context.Update.set({
      id: `${event.params.milestoneId}:grant-update-${event.transactionHash}-${event.logIndex}`,
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

    const newPendingMilestoneCount = currentMilestones.milestonesPending - 1;
    const hasPendingMilestones = newPendingMilestoneCount > 0;
    const newMilestonesRejectedCount = currentMilestones.milestonesRejected + 1;

    context.RawMetadata.set({
      id: event.params.reason[1],
      protocol: event.params.reason[0],
      pointer: event.params.reason[1],
    });

    context.Milestone.set({
      ...milestone,
      status: GameStatus.Rejected,
    });

    context.MilestoneSet.set({
      ...currentMilestones,
      milestonesPending: newPendingMilestoneCount,
      milestonesRejected: newMilestonesRejectedCount,
    });

    context.Grant.set({
      ...grant,
      hasRejectedMilestones: true,
      hasPendingMilestones,
      lastUpdated: event.blockTimestamp,
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
      contentSchema: ContentSchema.Reason,
      content_id: event.params.reason[1],
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grant.id,
    });

    addFeedCard({
      message: `${ship.name} did not approve ${project.name}'s milestone`,
      tag: 'grant/milestone/reject',
      domain: ship.gameManager_id || 'NEVER',
      subject: {
        id: ship.id,
        playerType: Player.Ship,
        name: ship.name,
        pointer: ship.profileMetadata_id,
      },
      object: {
        id: project.id,
        playerType: Player.Project,
        name: project.name,
      },
      setEntity: context.FeedItemEntity.set,
      event,
      setCard: context.FeedCard.set,
      setEmbed: context.FeedItemEmbed.set,
      setMetadata: context.RawMetadata.set,
      internalLink: `/grant/${grantId}/milestones`,
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
  context.GrantShip.set({
    ...ship,
    totalDistributed: ship.totalDistributed + event.params.amount,
    totalAllocated: ship.totalAllocated - event.params.amount,
  });

  context.Grant.set({
    ...grant,
    amountDistributed: grant.amountDistributed + event.params.amount,
    lastUpdated: event.blockTimestamp,
  });

  context.Update.set({
    id: `${event.params.amount}:grant-update-${event.transactionHash}-${event.logIndex}`,
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
    timestamp: event.blockTimestamp + 1,
    postBlockNumber: event.blockNumber,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });

  addFeedCard({
    message: `${ship.name} distributed ${inWeiMarker(event.params.amount)} to ${project.name}`,
    tag: 'grant/distributed',
    domain: ship.gameManager_id || 'NEVER',
    subject: {
      id: ship.id,
      playerType: Player.Ship,
      name: ship.name,
      pointer: ship.profileMetadata_id,
    },
    object: {
      id: project.id,
      playerType: Player.Project,
      name: project.name,
    },
    setEntity: context.FeedItemEntity.set,
    event,
    setCard: context.FeedCard.set,
    setEmbed: context.FeedItemEmbed.set,
    setMetadata: context.RawMetadata.set,
    internalLink: `/grant/${grantId}`,
  });

  addTransaction(event, context.Transaction.set);
});

GrantShipStrategyContract.GrantComplete.loader(({ event, context }) => {
  context.Grant.load(
    _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    }),
    {
      loadProject: {},
      loadShip: {},
    }
  );
});

GrantShipStrategyContract.GrantComplete.handler(({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const grant = context.Grant.get(grantId);
  const project = grant ? context.Grant.getProject(grant) : null;
  const ship = grant ? context.Grant.getShip(grant) : null;

  if (!grant || !project || !ship) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }

  context.Grant.set({
    ...grant,
    grantCompleted: true,
    lastUpdated: event.blockTimestamp,
    status: GrantStatus.Completed,
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

  addFeedCard({
    message: `${project.name} and ${ship.name} have completed their grant!`,
    tag: 'grant/complete',
    domain: ship.gameManager_id || 'NEVER',
    subject: {
      id: project.id,
      playerType: Player.Project,
      name: project.name,
      pointer: project.metadata_id,
    },
    object: {
      id: ship.id,
      playerType: Player.Ship,
      name: ship.name,
    },
    setEntity: context.FeedItemEntity.set,
    event,
    setCard: context.FeedCard.set,
    setEmbed: context.FeedItemEmbed.set,
    setMetadata: context.RawMetadata.set,
    internalLink: `/grant/${grantId}`,
  });

  addTransaction(event, context.Transaction.set);
});
// update
