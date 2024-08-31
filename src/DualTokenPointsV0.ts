import { DualTokenPointsV0Contract } from 'generated';
import { addTransaction } from './utils/sync';

DualTokenPointsV0Contract.Initialized.loader(() => {});

DualTokenPointsV0Contract.Initialized.handler(({ event, context }) => {
  context.DualTokenPointsParams.set({
    id: event.srcAddress,
    contextTokenAddress: event.params.contextToken,
    daoTokenAddress: event.params.daoToken,
    votingCheckpoint: event.params.votingCheckpoint,
  });

  addTransaction(event, context.Transaction.set);
});
