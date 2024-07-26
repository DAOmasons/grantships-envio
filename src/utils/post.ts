import {
  GrantShipStrategyContract_UpdatePostedEvent_eventArgs,
  GrantShipStrategyContract_UpdatePostedEvent_handlerContext,
  eventLog,
  grantEntity,
  grantShipEntity,
} from 'generated';
import { _grantId } from './id';
import { ContentSchema, Player, UpdateScope } from './constants';

const invokeFacilitatorAction = ({
  event,
  context,
  contractTag,
}: {
  event: eventLog<GrantShipStrategyContract_UpdatePostedEvent_eventArgs>;
  context: GrantShipStrategyContract_UpdatePostedEvent_handlerContext;
  contractTag: string;
}) => {};

const invokeProjectAction = ({
  event,
  context,
  contractTag,
}: {
  event: eventLog<GrantShipStrategyContract_UpdatePostedEvent_eventArgs>;
  context: GrantShipStrategyContract_UpdatePostedEvent_handlerContext;
  contractTag: string;
}) => {};

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
