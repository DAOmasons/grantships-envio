import { GrantShipFactory } from 'generated';

GrantShipFactory.ShipCreated.contractRegister(async ({ event, context }) => {
  context.addGrantShipStrategy(event.params.strategyAddress);
});

GrantShipFactory.ShipCreated.handler(async ({ event, context }) => {
  const gameManager = await context.GameManager.get(event.params.sender);

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
