import { DualTokenPointsV0 } from 'generated';
import { addTransaction } from './utils/sync';

DualTokenPointsV0.Initialized.handler(async ({ event, context }) => {
  context.DualTokenPointsParams.set({
    id: event.srcAddress,
    contextTokenAddress: event.params.contextToken,
    daoTokenAddress: event.params.daoToken,
    votingCheckpoint: event.params.votingCheckpoint,
  });

  addTransaction(event, context);
});
