import { GameManagerFactoryContract } from 'generated';

GameManagerFactoryContract.FactoryInitialized.loader(({ event }) => {});

GameManagerFactoryContract.FactoryInitialized.handler(({ event, context }) => {
  context.GameManagerFactory.set({
    id: event.srcAddress,
    rootAccount: event.params.rootAccount,
    chainId: event.chainId,
    createdAt: event.blockTimestamp,
  });
});

GameManagerFactoryContract.TemplateCreated.loader(({ event }) => {});

GameManagerFactoryContract.TemplateCreated.handler(({ event, context }) => {
  context.GameManagerTemplate.set({
    id: event.params.name,
    name: event.params.name,
    address: event.params.templateAddress,
    chainId: event.chainId,
    createdAt: event.blockTimestamp,
  });
});

GameManagerFactoryContract.RootAccountSwitched.loader(({ event, context }) => {
  context.GameManagerFactory.load(event.srcAddress);
});

GameManagerFactoryContract.RootAccountSwitched.handler(({ event, context }) => {
  const gmFactory = context.GameManagerFactory.get(event.srcAddress);

  if (!gmFactory) {
    return;
  }

  context.GameManagerFactory.set({
    ...gmFactory,
    rootAccount: event.params.newRootAccount,
  });
});

GameManagerFactoryContract.GameManagerDeployedWithPool.loader(
  ({ event, context }) => {
    context.contractRegistration.addGameManagerStrategy(
      event.params.gameManagerAddress
    );

    context.GameManagerFactory.load(event.srcAddress);
    context.GMInitParams.load(event.params.gameManagerAddress);
  }
);

GameManagerFactoryContract.GameManagerDeployedWithPool.handler(
  ({ event, context }) => {
    const gmInitParams = context.GMInitParams.get(
      event.params.gameManagerAddress
    );

    if (!gmInitParams) {
      return;
    }

    context.GameManager.set({
      id: event.params.gameManagerAddress,
      template_id: event.params.templateName,
      poolId: event.params.poolId,
      profileId: event.params.profileId,
      chainId: event.chainId,
      createdAt: event.blockTimestamp,
      tokenAddress: event.params.tokenAddress,
      currentRoundNumber: BigInt(0),
      poolMetadataProtocol: event.params.poolMetadata[0],
      poolMetadataPointer: event.params.poolMetadata[1],
      profileMetadataProtocol: event.params.profileMetadata[0],
      profileMetadataPointer: event.params.profileMetadata[1],
      initData: event.params.initData,
      gameFacilitatorId: gmInitParams.gameFacilitatorId,
      poolFunds: undefined,
      currentRound_id: undefined,
      gmRootAccount: gmInitParams.gmRootAccount,
    });
  }
);
