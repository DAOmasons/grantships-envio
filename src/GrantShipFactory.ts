import { GrantShipFactoryContract } from 'generated';

GrantShipFactoryContract.ShipCreated.loader(({ event, context }) => {
  context.GameManager.load(event.params.sender, {});

  context.contractRegistration.addGrantShipStrategy(
    event.params.strategyAddress
  );
});

GrantShipFactoryContract.ShipCreated.handler(({ event, context }) => {
  const gameManager = context.GameManager.get(event.params.sender);

  if (!gameManager) {
    console.warn(
      `GameManager not found: Sender address ${event.params.sender}. It's possible that this was called from outside a Grant Ships round`
    );
  }

  context.ShipContext.set({
    id: event.params.strategyAddress,
    shipAddress: event.params.strategyAddress,
    grantShip_id: event.params.anchorAddress,
    gameManager_id: event.params.sender,
  });
});
