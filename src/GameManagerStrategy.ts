import { GameManagerStrategyContract } from 'generated';
import {
  ContentSchema,
  GameStatus,
  PostDecorator,
  Player,
  UpdateScope,
} from './utils/constants';
import { addTransaction } from './utils/sync';
import { addFeedCard, inWeiMarker } from './utils/feed';
import { CHAIN } from './utils/network';

GameManagerStrategyContract.GameManagerInitialized.loader(() => {});

GameManagerStrategyContract.GameManagerInitialized.handler(
  ({ event, context }) => {
    context.GMInitParams.set({
      id: event.srcAddress,
      gmRootAccount: event.params.rootAccount,
      gameFacilitatorId: event.params.gameFacilitatorId,
    });
    addTransaction(event, context);

    addFeedCard({
      message: `Facilitator Crew Initialized the Game Manager Contract`,
      tag: 'gm-initialized',
      domain: event.srcAddress,
      event,
      subject: {
        id: event.srcAddress,
        playerType: Player.GameFacilitator,
        name: 'Facilitator Crew',
        pointer: 'facilitators',
      },
      setCard: context.FeedCard.set,
      setEntity: context.FeedItemEntity.set,
      setEmbed: context.FeedItemEmbed.set,
      setMetadata: context.RawMetadata.set,
      externalLink: `${CHAIN?.[event.chainId]?.SCAN}/address/${event.srcAddress}`,
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

  addTransaction(event, context);

  addFeedCard({
    message: `${grantShip.name} submitted a Grant Ship application`,
    tag: 'ship-submit-application',
    domain: event.srcAddress,
    event,
    subject: {
      id: grantShip.id,
      playerType: Player.Ship,
      name: grantShip.name,
      pointer: grantShip.profileMetadata_id,
    },
    setCard: context.FeedCard.set,
    setEntity: context.FeedItemEntity.set,
    setEmbed: context.FeedItemEmbed.set,
    setMetadata: context.RawMetadata.set,
    internalLink: `${`/ship/${grantShip.id}`}`,
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

  addTransaction(event, context);
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

  addTransaction(event, context);
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

  addFeedCard({
    message: `Grant Ship launched! ${ship.name} has been approved to run a grant ship!`,
    tag: 'ship-launched',
    domain: event.srcAddress,
    event,
    subject: {
      id: ship.id,
      playerType: Player.Ship,
      name: ship.name,
      pointer: ship.profileMetadata_id,
    },
    setCard: context.FeedCard.set,
    setEntity: context.FeedItemEntity.set,
    setEmbed: context.FeedItemEmbed.set,
    setMetadata: context.RawMetadata.set,
    internalLink: `${`/ship/${ship.id}`}`,
  });

  addTransaction(event, context);
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

  addTransaction(event, context);
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

  addTransaction(event, context);
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
    totalRoundAmount: event.params.amount,
  });

  context.GameRound.set({
    ...currentRound,
    gameStatus: GameStatus.Funded,
    totalDistributedAmount:
      currentRound.totalDistributedAmount + event.params.amount,
  });

  addFeedCard({
    message: `${ship.name} has received ${inWeiMarker(event.params.amount)} for the next round!`,
    tag: 'ship-funded',
    domain: event.srcAddress,
    event,
    subject: {
      id: ship.id,
      playerType: Player.Ship,
      name: ship.name,
      pointer: ship.profileMetadata_id,
    },
    setCard: context.FeedCard.set,
    setEntity: context.FeedItemEntity.set,
    setEmbed: context.FeedItemEmbed.set,
    setMetadata: context.RawMetadata.set,
    internalLink: `${`/ship/${ship.id}`}`,
  });

  addTransaction(event, context);
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

    addTransaction(event, context);

    addFeedCard({
      message: `Game Start! Funding round has begun!`,
      tag: 'gm-initialized',
      domain: event.srcAddress,
      event,
      subject: {
        id: event.srcAddress,
        playerType: Player.GameFacilitator,
        name: 'Facilitator Crew',
        pointer: 'facilitators',
      },
      setCard: context.FeedCard.set,
      setEntity: context.FeedItemEntity.set,
      setEmbed: context.FeedItemEmbed.set,
      setMetadata: context.RawMetadata.set,
    });
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

    addFeedCard({
      message: `Game Complete! Funding round is over. Stay tuned for the voting round.`,
      tag: 'gm-initialized',
      domain: event.srcAddress,
      event,
      subject: {
        id: event.srcAddress,
        playerType: Player.GameFacilitator,
        name: 'Facilitator Crew',
        pointer: 'facilitators',
      },
      setCard: context.FeedCard.set,
      setEntity: context.FeedItemEntity.set,
      setEmbed: context.FeedItemEmbed.set,
      setMetadata: context.RawMetadata.set,
    });

    addTransaction(event, context);
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
    addTransaction(event, context);
  }
);

GameManagerStrategyContract.UpdatePosted.loader(({ event, context }) => {});
GameManagerStrategyContract.UpdatePosted.handler(({ event, context }) => {
  const [, action] = event.params.tag.split(':');

  if (action === 'FACILITATOR_POST_UPDATE') {
    context.RawMetadata.set({
      id: event.params.tag,
      protocol: event.params.content[0],
      pointer: event.params.content[1],
    });

    const postId = `facilitator-post-${event.transactionHash}-${event.logIndex}`;

    context.Update.set({
      id: postId,
      tag: 'facilitator/post',
      scope: UpdateScope.Game,
      domain_id: event.srcAddress,
      playerType: Player.GameFacilitator,
      entityAddress: event.srcAddress,
      content_id: event.params.content[1],
      postDecorator: undefined,
      message: undefined,
      postedBy: event.txOrigin || 'Unknown',
      contentSchema: ContentSchema.RichText,
      timestamp: event.blockTimestamp,
      postBlockNumber: event.blockNumber,
      chainId: event.chainId,
      entityMetadata_id: undefined,
      hostEntityId: event.srcAddress,
    });

    addFeedCard({
      message: undefined,
      tag: 'facilitator/post',
      domain: event.srcAddress,
      event,
      richTextContent: {
        protocol: event.params.content[0],
        pointer: event.params.content[1],
      },
      subject: {
        id: event.srcAddress,
        playerType: Player.GameFacilitator,
        name: 'Facilitator Crew',
        pointer: 'facilitators',
      },
      setCard: context.FeedCard.set,
      setEntity: context.FeedItemEntity.set,
      setEmbed: context.FeedItemEmbed.set,
      setMetadata: context.RawMetadata.set,
      internalLink: `/post/${postId}`,
    });

    addTransaction(event, context);
  }
});
