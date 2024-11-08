import {
  handlerContext,
  GrantShipStrategy_UpdatePosted_eventArgs,
  eventLog,
} from 'generated';
import { _applicationId, _grantId } from './id';
import {
  ContentSchema,
  GameStatus,
  GrantStatus,
  Player,
  UpdateScope,
} from './constants';
import { addTransaction } from './sync';
import { addFeedCard } from './feed';
import { isAddress } from 'viem';
import { GrantShip_t } from 'generated/src/db/Entities.gen';

const invokeFacilitatorAction = async ({
  event,
  context,
  contractTag,
  ship,
}: {
  event: eventLog<GrantShipStrategy_UpdatePosted_eventArgs>;
  context: handlerContext;
  contractTag: string;
  ship?: GrantShip_t;
}) => {
  const [, action, projectId] = contractTag.split(':');

  if (!projectId) {
    context.log.warn(`Project ID not found: ${projectId}`);
    return;
  }

  const grantId = _grantId({
    projectId,
    shipSrc: event.srcAddress,
  });

  if (!ship) {
    context.log.warn('Ship not found in Facilitator Action');
    return;
  }

  if (!grantId) {
    context.log.warn('Grant Id not found in Facilitator Action');
    return;
  }

  if (action === 'FACILITATOR_GRANT_UPDATE') {
    context.RawMetadata.set({
      id: event.params.content[1],
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });

    context.Update.set({
      id: `facilitator-update-${event.transaction.hash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/update/facilitator',
      playerType: Player.GameFacilitator,
      domain_id: ship.gameManager_id,
      entityAddress: 'facilitators',
      entityMetadata_id: undefined,
      postedBy: event.transaction.from,
      message: undefined,
      content_id: event.params.content[1],
      contentSchema: ContentSchema.RichText,
      postDecorator: undefined,
      timestamp: event.block.timestamp,
      postBlockNumber: event.block.number,
      chainId: event.chainId,
      hostEntityId: grantId,
    });

    addTransaction(event, context);
    return;
  }

  context.log.warn(`Action not found: In Facilitator Action: ${action}`);
};

const invokeProjectAction = async ({
  event,
  context,
  contractTag,
  ship,
}: {
  event: eventLog<GrantShipStrategy_UpdatePosted_eventArgs>;
  context: handlerContext;
  contractTag: string;
  ship?: GrantShip_t;
}) => {
  const [, action] = contractTag.split(':');

  if (action === 'PROJECT_GRANT_UPDATE') {
    const [, , projectId] = event.params.tag.split(':');

    if (!projectId) {
      context.log.error(`Project ID not found: ${projectId}`);
      return;
    }

    const grantId = _grantId({
      projectId,
      shipSrc: event.srcAddress,
    });

    const grant = await context.Grant.get(grantId);

    const project = await context.Project.get(event.params.recipientId);

    if (!project || !ship) {
      context.log.error(
        `Project or ship not found. Recipient ID: ${event.params.recipientId} Src Address: ${event.srcAddress}`
      );
      return;
    }

    context.RawMetadata.set({
      id: event.params.content[1],
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });

    context.Update.set({
      id: `grant-update-${event.transaction.hash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/update/project',
      playerType: Player.Project,
      domain_id: ship.gameManager_id,
      entityAddress: project.id,
      entityMetadata_id: project.metadata_id,
      postedBy: event.transaction.from,
      message: undefined,
      content_id: event.params.content[1],
      contentSchema: ContentSchema.RichText,
      postDecorator: undefined,
      timestamp: event.block.timestamp,
      postBlockNumber: event.block.number,
      chainId: event.chainId,
      hostEntityId: grantId,
    });
    if (!grant) {
      context.Grant.set({
        id: grantId,
        project_id: projectId,
        ship_id: ship.id,
        gameManager_id: ship.gameManager_id || 'NOT_FOUND',
        lastUpdated: event.block.timestamp,
        amount: undefined,
        status: GrantStatus.ProjectInitiated,
        amountAllocated: 0n,
        amountDistributed: 0n,
        isAllocated: false,
        grantCompleted: false,
        hasPendingMilestones: false,
        hasRejectedMilestones: false,
        allMilestonesApproved: false,
        applicationApproved: false,
        currentMilestones_id: undefined,
        currentApplication_id: undefined,
        requestingEarlyReview: false,
      });
    }
    addTransaction(event, context);
  } else {
    context.log.warn(`In Project: Action not found: ${action}`);
  }
};

const invokeShipAction = async ({
  event,
  context,
  contractTag,
  ship,
}: {
  event: eventLog<GrantShipStrategy_UpdatePosted_eventArgs>;
  context: handlerContext;
  contractTag: string;
  ship: GrantShip_t;
}) => {
  const [, action] = contractTag.split(':');

  if (action === 'SHIP_BEACON') {
    context.RawMetadata.set({
      id: event.params.content[1],
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });
    context.GrantShip.set({
      ...ship,
      beaconMessage_id: event.params.content[1],
      beaconLastUpdated: event.block.timestamp,
    });

    addTransaction(event, context);
  } else if (action === 'SHIP_APPLICATION') {
    context.RawMetadata.set({
      id: event.params.content[1],
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });
    context.GrantShip.set({
      ...ship,
      customApplication_id: event.params.content[1],
    });
    addTransaction(event, context);
  } else if (action === 'SHIP_INVITE') {
    const [, , projectId] = event.params.tag.split(':');
    const grantId = _grantId({
      projectId: projectId,
      shipSrc: event.srcAddress,
    });

    const grant = await context.Grant.get(grantId);
    const project = await context.Project.get(projectId);

    if (!project) {
      context.log.error(`Project not found: ${projectId}`);
      return;
    }

    context.Update.set({
      id: `grant-update-${event.transaction.hash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/invite/ship',
      playerType: Player.System,
      domain_id: ship.gameManager_id,
      entityAddress: 'system',
      entityMetadata_id: undefined,
      postedBy: event.transaction.from,
      message: undefined,
      content_id: undefined,
      contentSchema: ContentSchema.BasicUpdate,
      postDecorator: undefined,
      timestamp: event.block.timestamp,
      postBlockNumber: event.block.number,
      chainId: event.chainId,
      hostEntityId: grantId,
    });

    if (!grant) {
      context.Grant.set({
        id: grantId,
        project_id: projectId,
        ship_id: ship.id,
        gameManager_id: ship.gameManager_id || 'NOT_FOUND',
        lastUpdated: event.block.timestamp,
        amount: undefined,
        status: GrantStatus.ShipInitiated,
        amountAllocated: 0n,
        amountDistributed: 0n,
        isAllocated: false,
        grantCompleted: false,
        hasPendingMilestones: false,
        hasRejectedMilestones: false,
        allMilestonesApproved: false,
        applicationApproved: false,
        currentMilestones_id: undefined,
        currentApplication_id: undefined,
        requestingEarlyReview: false,
      });

      addFeedCard({
        message: `${ship.name} has invited ${project.name}'s to apply for a grant.`,
        tag: 'grant/invite',
        domain: ship.gameManager_id || '',
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
          protocol: event.params.content[0],
          pointer: event.params.content[1],
          key: 'text',
        },
        context,
        event,
        internalLink: `/grant/${grantId}`,
      });

      addTransaction(event, context);
    }
  } else if (action === 'SHIP_GRANT_UPDATE') {
    const [, , projectId] = event.params.tag.split(':');
    const grantId = _grantId({
      projectId: projectId,
      shipSrc: event.srcAddress,
    });
    const grant = context.Grant.get(grantId);

    context.RawMetadata.set({
      id: event.params.content[1],
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });

    context.Update.set({
      id: `grant-update-${event.transaction.hash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/update/ship',
      playerType: Player.Ship,
      domain_id: ship.gameManager_id,
      entityAddress: ship.id,
      entityMetadata_id: ship.profileMetadata_id,
      postedBy: event.transaction.from,
      message: undefined,
      content_id: event.params.content[1],
      contentSchema: ContentSchema.RichText,
      postDecorator: undefined,
      timestamp: event.block.timestamp,
      postBlockNumber: event.block.number,
      chainId: event.chainId,
      hostEntityId: grantId,
    });
    if (!grant) {
      context.Grant.set({
        id: grantId,
        project_id: projectId,
        ship_id: ship.id,
        gameManager_id: ship.gameManager_id || 'NOT_FOUND',
        lastUpdated: event.block.timestamp,
        amount: undefined,
        status: GrantStatus.ShipInitiated,
        amountAllocated: 0n,
        amountDistributed: 0n,
        isAllocated: false,
        grantCompleted: false,
        hasPendingMilestones: false,
        hasRejectedMilestones: false,
        allMilestonesApproved: false,
        applicationApproved: false,
        currentMilestones_id: undefined,
        currentApplication_id: undefined,
        requestingEarlyReview: false,
      });
    }
    addTransaction(event, context);
  } else if (action === 'SHIP_REVIEW_GRANT') {
    const [, , projectId, decision] = event.params.tag.split(':');
    const grantId = _grantId({
      projectId: projectId,
      shipSrc: event.srcAddress,
    });
    const grant = await context.Grant.get(grantId);
    const project = await context.Project.get(projectId);
    if (!grant) {
      context.log.error(`Grant not found: ${_grantId}`);
      return;
    }
    if (!project) {
      context.log.error(`Project not found: ${projectId}`);
      return;
    }
    if (!grant.currentApplication_id) {
      context.log.error(`Application not found: ${grant.id}`);
      return;
    }

    const application = await context.Application.get(
      grant.currentApplication_id
    );

    if (!application) {
      context.log.error(`Application not found: ${grant.id}`);
      return;
    }

    const isApproved = Number(decision) === GameStatus.Accepted;
    const isRejected = Number(decision) === GameStatus.Rejected;

    if (!isApproved && !isRejected) {
      context.log.error(`Invalid decision: ${decision}`);
    }

    context.RawMetadata.set({
      id: event.params.content[1],
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });

    context.Grant.set({
      ...grant,
      status: isApproved
        ? GrantStatus.ApplicationApproved
        : GrantStatus.ApplicationRejected,
      lastUpdated: event.block.timestamp,
    });

    context.Application.set({
      ...application,
      status: Number(decision),
    });

    context.Update.set({
      id: `grant-update-${event.transaction.hash}`,
      scope: UpdateScope.Grant,
      tag: isApproved
        ? 'grant/approve/application'
        : 'grant/reject/application',
      playerType: Player.Ship,
      domain_id: grant.gameManager_id,
      entityAddress: ship.id,
      entityMetadata_id: ship.profileMetadata_id,
      postedBy: event.transaction.from,
      message: isApproved
        ? `${ship.name} has approved the Application`
        : `${ship.name} has not approved the Application`,
      content_id: event.params.content[1],
      contentSchema: ContentSchema.Reason,
      postDecorator: undefined,
      timestamp: event.block.timestamp,
      postBlockNumber: event.block.number,
      chainId: event.chainId,
      hostEntityId: grant.id,
    });

    addFeedCard({
      message: `${ship.name} ${isApproved ? 'has approved' : ' did not approve'} ${project.name}'s grant application.`,
      tag: 'grant/review/application',
      domain: ship.gameManager_id || '',
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
        protocol: event.params.content[0],
        pointer: event.params.content[1],
        key: 'reason',
      },
      context,
      event,
      internalLink: `/grant/${grantId}`,
    });

    addTransaction(event, context);
  } else if (action === 'SHIP_POST') {
    const [, , possibleDomainAddress] = event.params.tag.split(':');

    context.RawMetadata.set({
      id: event.params.content[1],
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });

    const postId = `ship-post-${event.transaction.hash}-${event.logIndex}`;

    const isCorrectDomain =
      isAddress(possibleDomainAddress) || possibleDomainAddress === 'Global';

    if (!isCorrectDomain) {
      context.log.warn(`Invalid domain address: ${possibleDomainAddress}`);
      return;
    }

    context.Update.set({
      id: postId,
      scope: UpdateScope.Ship,
      tag: 'ship/post',
      playerType: Player.Ship,
      domain_id: possibleDomainAddress,
      entityAddress: ship.id,
      entityMetadata_id: ship.profileMetadata_id,
      postedBy: event.transaction.from,
      message: undefined,
      content_id: event.params.content[1],
      contentSchema: ContentSchema.RichText,
      postDecorator: undefined,
      timestamp: event.block.timestamp,
      postBlockNumber: event.block.number,
      chainId: event.chainId,
      hostEntityId: ship.id,
    });

    addTransaction(event, context);

    addFeedCard({
      message: undefined,
      tag: 'ship/post',
      domain: possibleDomainAddress,
      event,
      richTextContent: {
        protocol: event.params.content[0],
        pointer: event.params.content[1],
      },
      subject: {
        id: ship.id,
        playerType: Player.Ship,
        name: ship.name,
        pointer: ship.profileMetadata_id,
      },
      context,
      internalLink: `/post/${postId}`,
    });
  } else if (action === 'REQUEST_FACILITATOR') {
    const [, , projectId] = event.params.tag.split(':');

    const grantId = _grantId({
      projectId,
      shipSrc: event.srcAddress,
    });

    const grant = await context.Grant.get(grantId);

    if (!grant) {
      context.log.error(`Grant not found: ${grantId}`);
      return;
    }

    context.Grant.set({
      ...grant,
      requestingEarlyReview: true,
    });

    context.Update.set({
      id: `request-facilitator-${event.transaction.hash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/request-facilitator',
      playerType: Player.Ship,
      domain_id: grant.gameManager_id,
      entityAddress: ship.id,
      entityMetadata_id: ship.profileMetadata_id,
      postedBy: event.transaction.from,
      message: undefined,
      content_id: undefined,
      contentSchema: undefined,
      postDecorator: undefined,
      timestamp: event.block.timestamp,
      postBlockNumber: event.block.number,
      chainId: event.chainId,
      hostEntityId: grant.id,
    });
  } else {
    context.log.warn(`Action not found: ${action}`);
  }
};

export const invokeActionByRoleType = async ({
  event,
  context,
}: {
  event: eventLog<GrantShipStrategy_UpdatePosted_eventArgs>;
  context: handlerContext;
}) => {
  const contractTag = event.params.tag;

  const role = event.params.role.toString();
  const shipContext = await context.ShipContext.get(event.srcAddress);

  if (!shipContext) {
    context.log.warn(`ShipContext not found: ${event.srcAddress}`);
    return;
  }

  const ship = await context.GrantShip.get(shipContext.grantShip_id);
  const gameManager = await context.GameManager.get(shipContext.gameManager_id);

  const isShipOperatorPosting = ship && role === ship.hatId;
  const isFacilitatorPosting =
    gameManager && role === gameManager.gameFacilitatorId?.toString();
  const isProjectPosting = role === '0';

  if (isFacilitatorPosting) {
    invokeFacilitatorAction({ event, context, contractTag, ship });
  } else if (isShipOperatorPosting) {
    invokeShipAction({ event, context, contractTag, ship });
  } else if (isProjectPosting) {
    invokeProjectAction({ event, context, contractTag, ship });
  } else {
    context.log.warn(`Role not found: ${role}`);
  }
};
