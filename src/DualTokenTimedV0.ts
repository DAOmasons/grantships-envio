import { DualTokenTimedV0Contract } from 'generated';
import { addTransaction } from './utils/sync';
import { createChoiceId, createVoteId } from './utils/id';

DualTokenTimedV0Contract.Initialized.loader(() => {});

DualTokenTimedV0Contract.Initialized.handler(({ event, context }) => {
  context.TVParams.set({
    id: event.srcAddress,
    voteDuration: event.params.duration,
  });
});

DualTokenTimedV0Contract.VotingStarted.loader(() => {});

DualTokenTimedV0Contract.VotingStarted.handlerAsync(
  async ({ event, context }) => {
    const module = await context.StemModule.get(event.srcAddress);

    if (!module) {
      context.log.error(
        `StemModule not found: Module address ${event.srcAddress}`
      );
      return;
    }

    if (!module.contestAddress) {
      context.log.error(
        `StemModule contestAddress not found: contest address ${module.contestAddress}`
      );
      return;
    }

    const gsVoting = await context.GrantShipsVoting.get(module.contestAddress);

    if (!gsVoting) {
      context.log.error(
        `GrantShipsVoting not found: Contest address ${module.contestAddress}`
      );
      return;
    }

    context.GrantShipsVoting.set({
      ...gsVoting,
      startTime: event.params.startTime,
      endTime: event.params.endTime,
      isVotingActive: true,
    });
    addTransaction(event, context.Transaction.set);
  }
);

DualTokenTimedV0Contract.VoteCast.loader(() => {});

DualTokenTimedV0Contract.VoteCast.handlerAsync(async ({ event, context }) => {
  const module = await context.StemModule.get(event.srcAddress);
  if (!module) {
    context.log.error(
      `StemModule not found: Module address ${event.srcAddress}`
    );
    return;
  }

  if (!module.contestAddress) {
    context.log.error(
      `StemModule contestAddress not found: contest address ${module.contestAddress}`
    );
    return;
  }

  const gsVoting = await context.GrantShipsVoting.get(module.contestAddress);

  if (!gsVoting) {
    context.log.error(
      `GrantShipsVoting not found: Contest address ${module.contestAddress}`
    );
    return;
  }

  const choice = await context.ShipChoice.get(
    createChoiceId({
      choiceId: event.params.choiceId,
      contestAddress: gsVoting.id,
    })
  );

  if (choice === undefined) {
    context.log.error(`ShipChoice not found: choice id ${choice}`);
    return;
  }

  const voteId = createVoteId(event);

  context.ShipVote.set({
    id: voteId,
    choice_id: choice.id,
    voter_id: event.params.voter,
    amount: event.params.amount,
    contest_id: gsVoting.id,
    mdProtocol: event.params._reason[0],
    mdPointer: event.params._reason[1],
    isRetractVote: false,
  });

  context.GSVoter.set({
    id: event.params.voter,
    address: event.params.voter,
  });
});
