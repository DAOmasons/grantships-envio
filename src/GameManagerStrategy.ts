import { GameManagerStrategyContract, gameRoundLoaderConfig } from 'generated';
import { GameStatus } from './utils/statuses';

GameManagerStrategyContract.GameManagerInitialized.loader(() => {});

GameManagerStrategyContract.GameManagerInitialized.handler(
  ({ event, context }) => {
    context.GMInitParams.set({
      id: event.srcAddress,
      gmRootAccount: event.params.rootAccount,
      gameFacilitatorId: event.params.gameFacilitatorId,
    });
  }
);

GameManagerStrategyContract.Registered.loader(({ event, context }) => {
  context.GrantShip.load(event.params.anchorAddress, {});
});

GameManagerStrategyContract.Registered.handler(({ event, context }) => {
  const grantShip = context.GrantShip.get(event.params.anchorAddress);

  if (!grantShip) {
    context.log.error(
      `GrantShip not found for anchor ${event.params.anchorAddress}`
    );
    return;
  }

  context.GrantShip.set({
    ...grantShip,
    gameManager_id: event.srcAddress,
    shipApplicationBytesData: event.params.applicationData,
    hasSubmittedApplication: true,
    isAwaitingApproval: true,
    applicationSubmittedTime: event.blockTimestamp,
    status: GameStatus.Pending,
  });
});

GameManagerStrategyContract.RoundCreated.loader(({ event, context }) => {
  context.GameManager.load(event.srcAddress, {});
});

GameManagerStrategyContract.RoundCreated.handler(({ event, context }) => {
  const gameManager = context.GameManager.get(event.srcAddress);

  if (!gameManager) {
    context.log.error(`GameManager not found for address ${event.srcAddress}`);
    return;
  }

  const gameRoundId = `${event.srcAddress}-${event.params.gameIndex}`;

  context.GameRound.set({
    id: gameRoundId,
    startTime: BigInt(0),
    endTime: BigInt(0),
    totalRoundAmount: event.params.totalRoundAmount,
    totalAllocatedAmount: BigInt(0),
    totalDistributedAmount: BigInt(0),
    gameStatus: GameStatus.Pending,
    isGameActive: false,
    gameManager_id: event.srcAddress,
    realEndTime: undefined,
    realStartTime: undefined,
  });

  context.GameManager.set({
    ...gameManager,
    currentRound_id: gameRoundId,
  });
});

GameManagerStrategyContract.RecipientRejected.loader(({ event, context }) => {
  context.GrantShip.load(event.params.recipientAddress, {});
});

GameManagerStrategyContract.RecipientRejected.handler(({ event, context }) => {
  const ship = context.GrantShip.get(event.params.recipientAddress);

  if (!ship) {
    context.log.error(
      `Ship not found for address ${event.params.recipientAddress}`
    );
    return;
  }

  context.RawMetadata.set({
    id: event.params.reason[1],
    protocol: event.params.reason[0],
    pointer: event.params.reason[1],
  });

  context.GrantShip.set({
    ...ship,
    status: GameStatus.Rejected,
    isRejected: true,
    isAwaitingApproval: false,
    rejectedTime: event.blockTimestamp,
    applicationReviewReason_id: event.params.reason[1],
  });
});

GameManagerStrategyContract.RecipientAccepted.loader(({ event, context }) => {
  context.GrantShip.load(event.params.recipientAddress, {});
});

GameManagerStrategyContract.RecipientAccepted.handler(({ event, context }) => {
  const ship = context.GrantShip.get(event.params.recipientAddress);

  if (!ship) {
    context.log.error(
      `Ship not found for address ${event.params.recipientAddress}`
    );
    return;
  }

  context.RawMetadata.set({
    id: event.params.reason[1],
    protocol: event.params.reason[0],
    pointer: event.params.reason[1],
  });

  context.GrantShip.set({
    ...ship,
    status: GameStatus.Accepted,
    isApproved: true,
    isAwaitingApproval: false,
    approvedTime: event.blockTimestamp,
    applicationReviewReason_id: event.params.reason[1],
  });
});
