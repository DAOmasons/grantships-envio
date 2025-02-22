import { GrantShipStrategy } from 'generated';
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

GrantShipStrategy.PoolFunded.handler(async ({ event, context }) => {
  const shipContext = await context.ShipContext.get(event.srcAddress);

  if (!shipContext) {
    context.log.error(
      `ShipContext not found: Ship address ${event.srcAddress}`
    );
    return;
  }

  const grantShip = await context.GrantShip.get(shipContext.grantShip_id);

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

GrantShipStrategy.GrantShipInitialized.handler(async ({ event, context }) => {
  const shipContext = await context.ShipContext.get(event.srcAddress);
  if (!shipContext) {
    context.log.error(
      `ShipContext not found: Ship address ${event.srcAddress}`
    );
    return;
  }

  const grantShip = await context.GrantShip.get(shipContext.grantShip_id);

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

GrantShipStrategy.RecipientRegistered.handler(async ({ event, context }) => {
  const shipContext = await context.ShipContext.get(event.srcAddress);
  const project = await context.Project.get(event.params.recipientId);

  if (!shipContext || !project) {
    context.log.error(
      `ShipContext or Project not found: Ship address ${event.srcAddress} Project address ${event.params.recipientId}`
    );
    return;
  }

  const grantShip = await context.GrantShip.get(shipContext.grantShip_id);
  const gameManager = await context.GameManager.get(shipContext.gameManager_id);

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

  const grant = await context.Grant.get(grantId);

  const currentApplication = grant
    ? await context.Application.get(grant?.currentApplication_id || '')
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
    timestamp: event.block.timestamp,
  });
  context.Grant.set({
    id: grantId,
    ship_id: grantShip.id,
    project_id: project.id,
    gameManager_id: gameManager.id,
    status: GrantStatus.ApplicationSubmitted,
    lastUpdated: event.block.timestamp,
    amount: event.params.grantAmount,
    amountAllocated: 0n,
    amountDistributed: 0n,
    isAllocated: false,
    grantCompleted: false,
    applicationApproved: false,
    hasPendingMilestones: false,
    hasRejectedMilestones: false,
    allMilestonesApproved: false,
    requestingEarlyReview: false,
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
    event,
    context,
    internalLink: `/grant/${grantId}/application`,
  });

  addTransaction(event, context);
});

GrantShipStrategy.UpdatePosted.handler(async ({ event, context }) => {
  if (event.params.tag.startsWith('TAG')) {
    invokeActionByRoleType({ event, context });
  } else {
    context.log.warn(`Tag not found: ${event.params.tag}`);
  }
});

GrantShipStrategy.MilestonesSet.handler(async ({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const shipContext = await context.ShipContext.get(event.srcAddress);

  if (!shipContext) {
    context.log.error(
      `ShipContext not found: Ship address ${event.srcAddress}`
    );
    return;
  }
  const grant = await context.Grant.get(grantId);
  const project = await context.Project.get(event.params.recipientId);
  const ship = await context.GrantShip.get(shipContext.grantShip_id);

  if (!grant || !project || !ship) {
    context.log.error(`Grant, Project, or Ship not found: Grant Id ${grantId}`);
    return;
  }

  const currentMilestones = grant?.currentMilestones_id
    ? await context.MilestoneSet.get(grant.currentMilestones_id)
    : null;

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
    timestamp: event.block.timestamp,
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
    lastUpdated: event.block.timestamp,
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
    context,
    event,
    internalLink: `/grant/${grantId}/milestones`,
  });

  addTransaction(event, context);
});

GrantShipStrategy.MilestonesReviewed.handler(async ({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const grant = await context.Grant.get(grantId);

  if (!grant) {
    context.log.error(`Grant not found: Grant Id ${grantId}`);
    return;
  }

  if (!grant.currentMilestones_id) {
    context.log.error(`Current Milestones not found: Grant Id ${grantId}`);
    return;
  }
  //

  const currentMilestones = await context.MilestoneSet.get(
    grant.currentMilestones_id
  );
  const ship = await context.GrantShip.get(grant.ship_id);
  const project = await context.Project.get(grant.project_id);

  if (!currentMilestones || !ship || !project) {
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
    lastUpdated: event.block.timestamp,
    status: isApproved
      ? GrantStatus.MilestonesApproved
      : GrantStatus.MilestonesRejected,
  });

  context.Update.set({
    id: `grant-update-${event.transaction.hash}`,
    scope: UpdateScope.Grant,
    tag: isApproved
      ? 'grant/approve/milestoneSet'
      : 'grant/reject/milestoneSet',
    playerType: Player.Ship,
    domain_id: grant.gameManager_id,
    entityAddress: ship.id,
    entityMetadata_id: ship.profileMetadata_id,
    postedBy: event.transaction.from,
    message: `${ship.name} has ${isApproved ? 'approved' : 'not approved'} ${project.name}'s Milestones Draft`,
    content_id: event.params.reason[1],
    contentSchema: ContentSchema.Reason,
    postDecorator: undefined,
    timestamp: event.block.timestamp,
    postBlockNumber: event.block.number,
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
    context,
    event,
    internalLink: `/grant/${grantId}/milestones`,
  });

  addTransaction(event, context);
});

GrantShipStrategy.RecipientStatusChanged.handler(
  async ({ event, context }) => {
    const grantId = _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    });
    const grant = await context.Grant.get(grantId);

    if (!grant) {
      context.log.error(`Grant not found: Grant Id ${grantId}`);
      return;
    }

    const ship = await context.GrantShip.get(grant.ship_id);
    const project = await context.Project.get(event.params.recipientId);

    //
    if (!grant || !ship || !project || !ship.gameManager_id) {
      context.log.error(
        `Grant, Ship, Project, or GameManager not found: ${grantId}`
      );
      return;
    }

    const gameManager = await context.GameManager.get(ship.gameManager_id);

    if (!gameManager) {
      context.log.error(`GameManager not found: ${ship.gameManager_id}`);
      return;
    }

    const isApproved = event.params.status === 2n;

    context.Grant.set({
      ...grant,
      status: isApproved
        ? GrantStatus.Allocated
        : GrantStatus.FacilitatorRejected,
      lastUpdated: event.block.timestamp,
    });

    context.RawMetadata.set({
      id: event.params.reason[1],
      protocol: event.params.reason[0],
      pointer: event.params.reason[1],
    });

    context.Update.set({
      id: `grant-update-${event.transaction.hash}-${event.logIndex}`,
      scope: UpdateScope.Grant,
      tag: isApproved ? 'grant/allocate/approved' : 'grant/allocate/rejected',
      message: `Facilitators have ${isApproved ? 'approved' : 'not approved'} ${project.name}`,
      playerType: Player.GameFacilitator,
      domain_id: gameManager.id,
      entityAddress: 'facilitators',
      entityMetadata_id: undefined,
      postedBy: event.transaction.from,
      content_id: event.params.reason[1],
      contentSchema: ContentSchema.Reason,
      postDecorator: undefined,
      timestamp: event.block.timestamp,
      postBlockNumber: event.block.number,
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
      event,
      context,
      internalLink: `/grant/${grantId}`,
    });
  }

  // doesn't need to be added to the transaction table
);

//

GrantShipStrategy.Allocated.handler(async ({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });
  const grant = await context.Grant.get(grantId);

  if (!grant) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }

  const ship = await context.GrantShip.get(grant.ship_id);
  const project = await context.Project.get(event.params.recipientId);

  if (!grant || !ship || !project || !ship.gameManager_id) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }
  const gameManager = await context.GameManager.get(ship.gameManager_id);
  if (!gameManager) {
    context.log.error(`GameManager not found: ${ship.gameManager_id}`);
    return;
  }

  context.Grant.set({
    ...grant,
    isAllocated: true,
    requestingEarlyReview: false,
    amountAllocated: event.params.amount,
    lastUpdated: event.block.timestamp,
  });

  context.GrantShip.set({
    ...ship,
    totalAllocated: ship.totalAllocated + event.params.amount,
    balance: ship.balance - event.params.amount,
  });

  context.Update.set({
    id: `grant-update-${event.transaction.hash}-${event.logIndex}`,
    scope: UpdateScope.Grant,
    tag: 'grant/allocation/locked',
    message: `Grant is locked in! ${ship.name} has allocated ${inWeiMarker(event.params.amount)} to ${project.name}`,
    playerType: Player.System,
    domain_id: gameManager.id,
    entityAddress: ship.id,
    entityMetadata_id: ship.profileMetadata_id,
    postedBy: event.transaction.from,
    contentSchema: undefined,
    content_id: undefined,
    postDecorator: undefined,
    timestamp: event.block.timestamp + 1,
    postBlockNumber: event.block.number,
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
    event,
    context,
    internalLink: `/grant/${grantId}`,
  });

  addTransaction(event, context);
});

GrantShipStrategy.MilestoneSubmitted.handler(async ({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const grant = await context.Grant.get(grantId);

  if (!grant || !grant.currentMilestones_id) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }

  const currentMilestones = await context.MilestoneSet.get(
    grant.currentMilestones_id
  );

  const project = await context.Project.get(event.params.recipientId);
  const ship = await context.GrantShip.get(grant.ship_id);

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
    lastUpdated: event.block.timestamp,
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
    id: `${event.params.milestoneId}:milestone-submit-${event.transaction.hash}`,
    scope: UpdateScope.Grant,
    tag: 'grant/milestone/submit',
    message: `${project.name} has submitted ${event.params.milestoneId + 1n}`,
    playerType: Player.Project,
    domain_id: grant.gameManager_id,
    entityAddress: project.id,
    entityMetadata_id: project.metadata_id,
    postedBy: event.transaction.from,
    contentSchema: ContentSchema.RichText,
    content_id: event.params.metadata[1],
    postDecorator: undefined,
    timestamp: event.block.timestamp,
    postBlockNumber: event.block.number,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });
  addTransaction(event, context);

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
    event,
    context,
    internalLink: `/grant/${grantId}/milestones`,
  });
});

GrantShipStrategy.MilestoneStatusChanged.handler(async ({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const grant = await context.Grant.get(grantId);

  if (!grant || !grant.currentMilestones_id) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }
  const currentMilestones = await context.MilestoneSet.get(
    grant.currentMilestones_id
  );
  const ship = await context.GrantShip.get(grant.ship_id);
  const project = await context.Project.get(event.params.recipientId);

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
    lastUpdated: event.block.timestamp,
    status: allMilestonesApproved
      ? GrantStatus.AllMilestonesComplete
      : grant.status,
  });

  context.Milestone.set({
    ...milestone,
    status: GameStatus.Accepted,
  });

  context.Update.set({
    id: `${event.params.milestoneId}:grant-update-${event.transaction.hash}-${event.logIndex}`,
    scope: UpdateScope.Grant,
    tag: 'grant/milestone/accepted',
    message: `${ship.name} has approved milestone ${event.params.milestoneId + 1n}`,
    playerType: Player.Ship,
    domain_id: grant.gameManager_id,
    entityAddress: ship.id,
    entityMetadata_id: ship.profileMetadata_id,
    postedBy: event.transaction.from,
    contentSchema: undefined,
    content_id: undefined,
    postDecorator: undefined,
    timestamp: event.block.timestamp,
    postBlockNumber: event.block.number,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });

  // doesn't need to be added to the transaction table
});

GrantShipStrategy.MilestoneRejected.handler(async ({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });
  const grant = await context.Grant.get(grantId);

  if (!grant || !grant.currentMilestones_id) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }

  const currentMilestones = await context.MilestoneSet.get(
    grant.currentMilestones_id
  );

  const ship = await context.GrantShip.get(grant.ship_id);
  const project = await context.Project.get(event.params.recipientId);

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
    lastUpdated: event.block.timestamp,
  });

  context.Update.set({
    id: `grant-update-${event.transaction.hash}`,
    scope: UpdateScope.Grant,
    tag: 'grant/milestone/rejected',
    message: `${ship.name} has rejected milestone ${event.params.milestoneId + 1n}`,
    playerType: Player.Ship,
    domain_id: grant.gameManager_id,
    entityAddress: ship.id,
    entityMetadata_id: ship.profileMetadata_id,
    postedBy: event.transaction.from,
    contentSchema: ContentSchema.Reason,
    content_id: event.params.reason[1],
    postDecorator: undefined,
    timestamp: event.block.timestamp,
    postBlockNumber: event.block.number,
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
    context,
    event,
    internalLink: `/grant/${grantId}/milestones`,
  });

  addTransaction(event, context);
});

GrantShipStrategy.Distributed.handler(async ({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const grant = await context.Grant.get(grantId);

  if (!grant) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }

  const ship = await context.GrantShip.get(grant.ship_id);
  const project = await context.Project.get(event.params.recipientId);

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
    lastUpdated: event.block.timestamp,
  });

  context.Update.set({
    id: `${event.params.amount}:grant-update-${event.transaction.hash}-${event.logIndex}`,
    scope: UpdateScope.Grant,
    tag: 'grant/distributed',
    message: `${ship.name} has distributed ${inWeiMarker(event.params.amount)} to ${project.name} at recipient address ${event.params.recipientAddress}`,
    playerType: Player.System,
    domain_id: grant.gameManager_id,
    entityAddress: 'system',
    entityMetadata_id: undefined,
    postedBy: event.transaction.from,
    contentSchema: undefined,
    content_id: undefined,
    postDecorator: undefined,
    timestamp: event.block.timestamp + 1,
    postBlockNumber: event.block.number,
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
    event,
    context,
    internalLink: `/grant/${grantId}`,
  });

  addTransaction(event, context);
});

GrantShipStrategy.GrantComplete.handler(async ({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const grant = await context.Grant.get(grantId);
  const project = await context.Project.get(event.params.recipientId);

  if (!grant || !project) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }

  const ship = await context.GrantShip.get(grant.ship_id);

  if (!ship) {
    context.log.error(`Ship not found: ${grant.ship_id}`);
    return;
  }

  context.Grant.set({
    ...grant,
    grantCompleted: true,
    lastUpdated: event.block.timestamp,
    status: GrantStatus.Completed,
  });

  context.Update.set({
    id: `grant-update-${event.transaction.hash}`,
    scope: UpdateScope.Grant,
    tag: 'grant/completed',
    message: `Grant has been completed`,
    playerType: Player.System,
    domain_id: grant.gameManager_id,
    entityAddress: 'system',
    entityMetadata_id: undefined,
    postedBy: event.transaction.from,
    contentSchema: undefined,
    content_id: undefined,
    postDecorator: undefined,
    timestamp: event.block.timestamp,
    postBlockNumber: event.block.number,
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
    event,
    context,
    internalLink: `/grant/${grantId}`,
  });

  addTransaction(event, context);
});

GrantShipStrategy.GrantClawback.handler(async ({ event, context }) => {
  const grantId = _grantId({
    projectId: event.params.recipientId,
    shipSrc: event.srcAddress,
  });

  const grant = await context.Grant.get(grantId);
  const project = await context.Project.get(event.params.recipientId);

  if (
    !project ||
    !grant ||
    !grant.currentApplication_id ||
    !grant.currentMilestones_id
  ) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }
  const ship = await context.GrantShip.get(grant.ship_id);

  if (!ship) {
    context.log.error(`Ship not found: ${grant.ship_id}`);
    return;
  }

  const currentMilestones = await context.MilestoneSet.get(
    grant?.currentMilestones_id
  );
  const currentApplication = await context.Application.get(
    grant?.currentApplication_id
  );

  if (!grant || !project || !ship) {
    context.log.error(`Grant not found: ${grantId}`);
    return;
  }

  if (!currentMilestones || !currentApplication) {
    context.log.error(
      `Current Milestones or Application not found: ${grantId}`
    );
    return;
  }

  context.Application.set({
    ...currentApplication,
    status: GameStatus.Rejected,
  });

  context.MilestoneSet.set({
    ...currentMilestones,
    status: GameStatus.Rejected,
  });

  context.Grant.set({
    ...grant,
    amountAllocated: 0n,
    isAllocated: false,
    status: GrantStatus.None,
    lastUpdated: event.block.timestamp,
  });

  context.GrantShip.set({
    ...ship,
    totalAllocated: ship.totalAllocated - event.params.amountReturned,
    balance: ship.balance + event.params.amountReturned,
  });

  context.RawMetadata.set({
    id: event.params.metadata[1],
    protocol: event.params.metadata[0],
    pointer: event.params.metadata[1],
  });

  context.Update.set({
    id: `grant-update-${event.transaction.hash}`,
    scope: UpdateScope.Grant,
    tag: 'grant/clawback',
    message: `Remaining Grant Funds have been clawed back`,
    playerType: Player.System,
    domain_id: grant.gameManager_id,
    entityAddress: 'system',
    entityMetadata_id: undefined,
    postedBy: event.transaction.from,
    contentSchema: ContentSchema.Reason,
    content_id: event.params.metadata[1],
    postDecorator: undefined,
    timestamp: event.block.timestamp,
    postBlockNumber: event.block.number,
    chainId: event.chainId,
    hostEntityId: grant.id,
  });

  addTransaction(event, context);
});
