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
