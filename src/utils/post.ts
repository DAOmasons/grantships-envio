import {
  GrantShipStrategyContract_UpdatePostedEvent_eventArgs,
  GrantShipStrategyContract_UpdatePostedEvent_handlerContext,
  eventLog,
  grantEntity,
  grantShipEntity,
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

const invokeFacilitatorAction = ({
  event,
  context,
  contractTag,
}: {
  event: eventLog<GrantShipStrategyContract_UpdatePostedEvent_eventArgs>;
  context: GrantShipStrategyContract_UpdatePostedEvent_handlerContext;
  contractTag: string;
}) => {
  context.log.warn(`Action not found: In Facilitator Action`);
};

const invokeProjectAction = ({
  event,
  context,
  contractTag,
  ship,
}: {
  event: eventLog<GrantShipStrategyContract_UpdatePostedEvent_eventArgs>;
  context: GrantShipStrategyContract_UpdatePostedEvent_handlerContext;
  contractTag: string;
  ship?: grantShipEntity;
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

    const grant = context.Grant.get(grantId);

    const project = context.Project.get(event.params.recipientId);

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
      id: `grant-update-${event.transactionHash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/update/project',
      playerType: Player.Project,
      domain_id: ship.gameManager_id,
      entityAddress: project.id,
      entityMetadata_id: project.metadata_id,
      postedBy: event.txOrigin,
      message: undefined,
      content_id: event.params.content[1],
      contentSchema: ContentSchema.RichText,
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grantId,
    });
    if (!grant) {
      context.Grant.set({
        id: grantId,
        project_id: projectId,
        ship_id: ship.id,
        gameManager_id: ship.gameManager_id || 'NOT_FOUND',
        lastUpdated: event.blockTimestamp,
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
      });
    }
    addTransaction(event, context.Transaction.set);
  } else {
    context.log.warn(`In Project: Action not found: ${action}`);
  }
};

const invokeShipAction = ({
  event,
  context,
  contractTag,
  ship,
}: {
  event: eventLog<GrantShipStrategyContract_UpdatePostedEvent_eventArgs>;
  context: GrantShipStrategyContract_UpdatePostedEvent_handlerContext;
  contractTag: string;
  ship: grantShipEntity;
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
      beaconLastUpdated: event.blockTimestamp,
    });

    addTransaction(event, context.Transaction.set);
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
    addTransaction(event, context.Transaction.set);
  } else if (action === 'SHIP_INVITE') {
    const [, , projectId] = event.params.tag.split(':');
    const grantId = _grantId({
      projectId: projectId,
      shipSrc: event.srcAddress,
    });

    const grant = context.Grant.get(grantId);
    const project = context.Project.get(projectId);

    if (!project) {
      context.log.error(`Project not found: ${projectId}`);
      return;
    }

    context.Update.set({
      id: `grant-update-${event.transactionHash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/invite/ship',
      playerType: Player.System,
      domain_id: ship.gameManager_id,
      entityAddress: 'system',
      entityMetadata_id: undefined,
      postedBy: event.txOrigin,
      message: undefined,
      content_id: undefined,
      contentSchema: ContentSchema.BasicUpdate,
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grantId,
    });

    if (!grant) {
      context.Grant.set({
        id: grantId,
        project_id: projectId,
        ship_id: ship.id,
        gameManager_id: ship.gameManager_id || 'NOT_FOUND',
        lastUpdated: event.blockTimestamp,
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
        setEntity: context.FeedItemEntity.set,
        event,
        setCard: context.FeedCard.set,
        setEmbed: context.FeedItemEmbed.set,
        setMetadata: context.RawMetadata.set,
        internalLink: `/grant/${grantId}`,
      });

      addTransaction(event, context.Transaction.set);
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
      id: `grant-update-${event.transactionHash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/update/ship',
      playerType: Player.Ship,
      domain_id: ship.gameManager_id,
      entityAddress: ship.id,
      entityMetadata_id: ship.profileMetadata_id,
      postedBy: event.txOrigin,
      message: undefined,
      content_id: event.params.content[1],
      contentSchema: ContentSchema.RichText,
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grantId,
    });
    if (!grant) {
      context.Grant.set({
        id: grantId,
        project_id: projectId,
        ship_id: ship.id,
        gameManager_id: ship.gameManager_id || 'NOT_FOUND',
        lastUpdated: event.blockTimestamp,
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
      });
    }
    addTransaction(event, context.Transaction.set);
  } else if (action === 'SHIP_REVIEW_GRANT') {
    const [, , projectId, decision] = event.params.tag.split(':');
    const grantId = _grantId({
      projectId: projectId,
      shipSrc: event.srcAddress,
    });
    const grant = context.Grant.get(grantId);
    const project = context.Project.get(projectId);
    if (!grant) {
      context.log.error(`Grant not found: ${_grantId}`);
      return;
    }
    if (!project) {
      context.log.error(`Project not found: ${projectId}`);
      return;
    }

    const application = context.Grant.getCurrentApplication(grant);

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
      lastUpdated: event.blockTimestamp,
    });

    context.Application.set({
      ...application,
      status: Number(decision),
    });

    context.Update.set({
      id: `grant-update-${event.transactionHash}`,
      scope: UpdateScope.Grant,
      tag: isApproved
        ? 'grant/approve/application'
        : 'grant/reject/application',
      playerType: Player.Ship,
      domain_id: grant.gameManager_id,
      entityAddress: ship.id,
      entityMetadata_id: ship.profileMetadata_id,
      postedBy: event.txOrigin,
      message: isApproved
        ? `${ship.name} has approved the Application`
        : `${ship.name} has not approved the Application`,
      content_id: event.params.content[1],
      contentSchema: ContentSchema.Reason,
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
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
      setEntity: context.FeedItemEntity.set,
      event,
      setCard: context.FeedCard.set,
      setEmbed: context.FeedItemEmbed.set,
      setMetadata: context.RawMetadata.set,
      internalLink: `/grant/${grantId}`,
    });

    addTransaction(event, context.Transaction.set);
  } else {
    context.log.warn(`Action not found: ${action}`);
  }
};

export const invokeActionByRoleType = ({
  event,
  context,
}: {
  event: eventLog<GrantShipStrategyContract_UpdatePostedEvent_eventArgs>;
  context: GrantShipStrategyContract_UpdatePostedEvent_handlerContext;
}) => {
  const contractTag = event.params.tag;

  const role = event.params.role.toString();
  const shipContext = context.ShipContext.get(event.srcAddress);
  const ship = shipContext
    ? context.ShipContext.getGrantShip(shipContext)
    : undefined;

  const gameManager = shipContext
    ? context.ShipContext.getGameManager(shipContext)
    : undefined;

  const isShipOperatorPosting = ship && role === ship.hatId;
  const isFacilitatorPosting =
    gameManager && role === gameManager.gameFacilitatorId?.toString();
  const isProjectPosting = role === '0';

  if (isFacilitatorPosting) {
    invokeFacilitatorAction({ event, context, contractTag });
  } else if (isShipOperatorPosting) {
    invokeShipAction({ event, context, contractTag, ship });
  } else if (isProjectPosting) {
    invokeProjectAction({ event, context, contractTag, ship });
  } else {
    context.log.warn(`Role not found: ${role}`);
  }
};
