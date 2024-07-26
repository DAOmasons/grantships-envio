import {
  GrantShipStrategyContract_UpdatePostedEvent_eventArgs,
  GrantShipStrategyContract_UpdatePostedEvent_handlerContext,
  eventLog,
  grantEntity,
  grantShipEntity,
} from 'generated';
import { _applicationId, _grantId } from './id';
import { ContentSchema, GrantStatus, Player, UpdateScope } from './constants';
import { addTransaction } from './sync';

const invokeFacilitatorAction = ({
  event,
  context,
  contractTag,
}: {
  event: eventLog<GrantShipStrategyContract_UpdatePostedEvent_eventArgs>;
  context: GrantShipStrategyContract_UpdatePostedEvent_handlerContext;
  contractTag: string;
}) => {
  context.log.error(`Action not found: In Facilitator Action`);
};

const invokeProjectAction = ({
  event,
  context,
  contractTag,
}: {
  event: eventLog<GrantShipStrategyContract_UpdatePostedEvent_eventArgs>;
  context: GrantShipStrategyContract_UpdatePostedEvent_handlerContext;
  contractTag: string;
}) => {
  const [, action] = contractTag.split(':');

  if (action === 'GRANT_UPDATE') {
    const grant = context.Grant.get(
      _grantId({
        projectId: event.params.recipientId,
        shipSrc: event.srcAddress,
      })
    );

    const project = context.Project.get(event.params.recipientId);

    if (!project || !grant) {
      context.log.error(
        `Project or grant not found. Recipient ID: ${event.params.recipientId} Src Address: ${event.srcAddress}`
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
      tag: 'grant/update',
      playerType: Player.Project,
      domain_id: grant.gameManager_id,
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
      hostEntityId: grant.id,
    });
  } else {
    context.log.error(`Action not found: ${action}`);
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

  if (action === 'BEACON') {
    context.RawMetadata.set({
      id: event.params.content[1],
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });

    context.GrantShip.set({
      ...ship,
      beaconMessage_id: event.params.content[1],
    });
    addTransaction(event, context.Transaction.set);
  } else if (action === 'GRANT_UPDATE') {
    const grantId = _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    });
    const grant = context.Grant.get(grantId);
    if (!grant) {
      context.log.error(`Grant not found: ${event.params.recipientId}`);
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
      tag: 'grant/update',
      playerType: Player.Ship,
      domain_id: grant.gameManager_id,
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
      hostEntityId: grant.id,
    });
    addTransaction(event, context.Transaction.set);
  } else if (action === 'SHIP_REVIEW') {
    const [, , decision] = event.params.content[1].split(':');
    const grantId = _grantId({
      projectId: event.params.recipientId,
      shipSrc: event.srcAddress,
    });
    const grant = context.Grant.get(grantId);
    if (!grant) {
      context.log.error(`Grant not found: ${event.params.recipientId}`);
      return;
    }

    const applicationId = _applicationId({
      projectId: grant.project_id,
      shipSrc: event.srcAddress,
      index: grant.applicationIndex,
    });

    const application = context.Application.get(applicationId);

    if (!application) {
      context.log.error(`Application not found: ${applicationId}`);
      return;
    }

    const isApproved = decision === 'APPROVED';
    const isRejected = decision === 'REJECTED';

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
      status: isApproved
        ? GrantStatus.ApplicationApproved
        : GrantStatus.ApplicationRejected,
    });

    context.Update.set({
      id: `grant-update-${event.transactionHash}`,
      scope: UpdateScope.Grant,
      tag: 'grant/approve/application',
      playerType: Player.Ship,
      domain_id: grant.gameManager_id,
      entityAddress: ship.id,
      entityMetadata_id: ship.profileMetadata_id,
      postedBy: event.txOrigin,
      message: isApproved
        ? `${ship.name} has approved the Application`
        : `${ship.name} has not approved the Application`,
      content_id: event.params.content[1],
      contentSchema: ContentSchema.BasicUpdate,
      postDecorator: undefined,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      hostEntityId: grant.id,
    });

    addTransaction(event, context.Transaction.set);
  } else {
    context.log.error(`Action not found: ${action}`);
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
    invokeProjectAction({ event, context, contractTag });
  } else {
    context.log.error(`Role not found: ${role}`);
  }
};
