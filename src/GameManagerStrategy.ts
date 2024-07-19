import { GameManagerStrategyContract } from 'generated';
import {
  ContentSchema,
  GameStatus,
  PostDecorator,
  UpdateScope,
} from './utils/statuses';
import { addTransaction } from './utils/sync';
import { addFeedCard, feedCardId } from './utils/feed';
import { CHAIN } from './utils/network';

GameManagerStrategyContract.GameManagerInitialized.loader(() => {});

GameManagerStrategyContract.GameManagerInitialized.handler(
  ({ event, context }) => {
    context.GMInitParams.set({
      id: event.srcAddress,
      gmRootAccount: event.params.rootAccount,
      gameFacilitatorId: event.params.gameFacilitatorId,
    });
    addTransaction(event, context.Transaction.set);

    addFeedCard({
      message: `Facilitator Crew Initialized the Game Manager Contract`,
      tag: 'gm-initialized',
      domain: event.srcAddress,
      event,
      subject: {
        id: event.srcAddress,
        type: 'facilitators',
        name: 'Facilitator Crew',
        pointer: 'facilitators',
      },
      setCard: context.FeedCard.set,
      setEntity: context.FeedItemEntity.set,
      setEmbed: context.FeedItemEmbed.set,
      setMetadata: context.RawMetadata.set,
      externalLink: `${CHAIN?.[event.chainId]?.SCAN}/tx/${event.transactionIndex}`,
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

  addTransaction(event, context.Transaction.set);
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

  addTransaction(event, context.Transaction.set);
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

  addTransaction(event, context.Transaction.set);
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

  addTransaction(event, context.Transaction.set);
});

GameManagerStrategyContract.ShipLaunched.loader(({ event, context }) => {
  context.GrantShip.load(event.params.recipientId, {});
});

GameManagerStrategyContract.ShipLaunched.handler(({ event, context }) => {
  const ship = context.GrantShip.get(event.params.recipientId);

  if (!ship) {
    context.log.error(`Ship not found for address ${event.params.recipientId}`);
    return;
  }

  context.GrantShip.set({
    ...ship,
    shipLaunched: true,
  });

  addTransaction(event, context.Transaction.set);
});

GameManagerStrategyContract.Allocated.loader(({ event, context }) => {
  context.GrantShip.load(event.params.recipientId, {});
  context.GameManager.load(event.srcAddress, { loadCurrentRound: {} });
});

GameManagerStrategyContract.Allocated.handler(({ event, context }) => {
  const ship = context.GrantShip.get(event.params.recipientId);
  const gameManager = context.GameManager.get(event.srcAddress);

  if (!ship) {
    context.log.error(`Ship not found for address ${event.params.recipientId}`);
    return;
  }

  if (!gameManager) {
    context.log.error(`GameManager not found for address ${event.srcAddress}`);
    return;
  }
  const currentRound = context.GameManager.getCurrentRound(gameManager);

  if (!currentRound) {
    context.log.error(
      `Current round not found for GameManager ${gameManager.id}`
    );
    return;
  }

  context.GrantShip.set({
    ...ship,
    isAllocated: true,
    status: GameStatus.Allocated,
    shipAllocation: event.params.amount,
  });

  context.GameRound.set({
    ...currentRound,
    gameStatus: GameStatus.Allocated,
    totalAllocatedAmount:
      currentRound.totalAllocatedAmount + event.params.amount,
  });

  addTransaction(event, context.Transaction.set);
});

GameManagerStrategyContract.Distributed.loader(({ event, context }) => {
  context.GrantShip.load(event.params.recipientId, {});
  context.GameManager.load(event.srcAddress, { loadCurrentRound: {} });
});

GameManagerStrategyContract.Distributed.handler(({ event, context }) => {
  const ship = context.GrantShip.get(event.params.recipientId);
  const gameManager = context.GameManager.get(event.srcAddress);

  if (!ship) {
    context.log.error(`Ship not found for address ${event.params.recipientId}`);
    return;
  }

  if (!gameManager) {
    context.log.error(`GameManager not found for address ${event.srcAddress}`);
    return;
  }

  const currentRound = context.GameManager.getCurrentRound(gameManager);

  if (!currentRound) {
    context.log.error(
      `Current round not found for GameManager ${gameManager.id}`
    );
    return;
  }

  context.GrantShip.set({
    ...ship,
    isDistributed: true,
    status: GameStatus.Active,
    totalRoundAmount: event.params.grantAmount,
  });

  context.GameRound.set({
    ...currentRound,
    gameStatus: GameStatus.Funded,
    totalDistributedAmount:
      currentRound.totalDistributedAmount + event.params.grantAmount,
  });

  addTransaction(event, context.Transaction.set);
});

GameManagerStrategyContract.GameActive.loader(({ event, context }) => {
  context.GameManager.load(event.srcAddress, { loadCurrentRound: {} });
});

GameManagerStrategyContract.GameActive.handler(({ event, context }) => {
  const gameManager = context.GameManager.get(event.srcAddress);

  if (!gameManager) {
    context.log.error(`GameManager not found for address ${event.srcAddress}`);
    return;
  }

  const currentRound = context.GameManager.getCurrentRound(gameManager);

  if (!currentRound) {
    context.log.error(
      `Current round not found for GameManager ${gameManager.id}`
    );
    return;
  }

  if (event.params.active === true) {
    context.GameRound.set({
      ...currentRound,
      gameStatus: GameStatus.Active,
      isGameActive: true,
      realStartTime: event.blockTimestamp,
    });

    addTransaction(event, context.Transaction.set);
  } else {
    context.GameRound.set({
      ...currentRound,
      gameStatus: GameStatus.Active,
      isGameActive: false,
      realStartTime: event.blockTimestamp,
    });

    context.GameManager.set({
      ...gameManager,
      currentRound_id: `${event.srcAddress}-${event.params.gameIndex}`,
    });

    addTransaction(event, context.Transaction.set);
  }
});

GameManagerStrategyContract.GameRoundTimesCreated.loader(
  ({ event, context }) => {
    context.GameManager.load(event.srcAddress, { loadCurrentRound: {} });
  }
);

GameManagerStrategyContract.GameRoundTimesCreated.handler(
  ({ event, context }) => {
    const gameManager = context.GameManager.get(event.srcAddress);

    if (!gameManager) {
      context.log.error(
        `GameManager not found for address ${event.srcAddress}`
      );
      return;
    }

    const currentRound = context.GameManager.getCurrentRound(gameManager);

    if (!currentRound) {
      context.log.error(
        `Current round not found for GameManager ${gameManager.id}`
      );
      return;
    }

    context.GameRound.set({
      ...currentRound,
      startTime: event.params.startTime,
      endTime: event.params.endTime,
    });
    addTransaction(event, context.Transaction.set);
  }
);

GameManagerStrategyContract.UpdatePosted.loader(({ event, context }) => {});
GameManagerStrategyContract.UpdatePosted.handler(({ event, context }) => {
  if (event.params.tag.startsWith('0xb02b7f97')) {
    context.RawMetadata.set({
      id: event.params.tag,
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });

    context.Update.set({
      id: event.transactionHash,
      tag: event.params.tag,
      scope: UpdateScope.Game,
      domain_id: event.srcAddress,
      posterRole: event.params.role,
      entityAddress: event.srcAddress,
      content_id: event.params.content[1],
      postDecorator: PostDecorator.Update,
      postedBy: event.txOrigin || 'Unknown',
      contentSchema: ContentSchema.BasicUpdate,
      timestamp: event.blockTimestamp,
    });

    addTransaction(event, context.Transaction.set);
  }
});
