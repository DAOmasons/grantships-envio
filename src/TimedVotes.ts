import { TimedVotes } from 'generated';
import { createChoiceId, createVoteId } from './utils/id';
import { addTransaction } from './utils/sync';

TimedVotes.Initialized.handler(async ({ event, context }) => {
  context.TVParams.set({
    id: event.srcAddress,
    voteDuration: event.params.duration,
  });

  addTransaction(event, context);
});

TimedVotes.VotingStarted.handler(async ({ event, context }) => {
  const stemModule = await context.StemModule.get(event.srcAddress);

  if (stemModule === undefined) {
    context.log.error(
      `StemModule not found: Module address ${event.srcAddress}`
    );
    return;
  }
  if (stemModule.contestAddress === undefined) {
    context.log.error(
      `StemModule contestAddress not found: contest address ${stemModule.contestAddress}`
    );
    return;
  }

  const gsVoting = await context.GrantShipsVoting.get(
    stemModule.contestAddress
  );

  if (gsVoting === undefined) {
    context.log.error(
      `GrantShipsVoting not found: Contest address ${stemModule.contestAddress}`
    );
    return;
  }

  context.GrantShipsVoting.set({
    ...gsVoting,
    startTime: event.params.startTime,
    endTime: event.params.endTime,
    isVotingActive: true,
  });
  addTransaction(event, context);
});

TimedVotes.VoteCast.handler(async ({ event, context }) => {
  const stemModule = await context.StemModule.get(event.srcAddress);

  if (stemModule === undefined) {
    context.log.error(
      `StemModule not found: Module address ${event.srcAddress}`
    );
    return;
  }

  if (stemModule.contestAddress === undefined) {
    context.log.error(
      `StemModule contestAddress not found: contest address ${stemModule.contestAddress}`
    );
    return;
  }

  const gsVoting = await context.GrantShipsVoting.get(
    stemModule.contestAddress
  );

  if (gsVoting === undefined) {
    context.log.error(
      `GrantShipsVoting not found: Contest address ${stemModule.contestAddress}`
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
    mdProtocol: event.params._3[0],
    token: gsVoting.voteTokenAddress,
    mdPointer: event.params._3[1],
    isRetractVote: false,
  });
  context.GSVoter.set({
    id: event.params.voter,
    address: event.params.voter,
  });

  context.ShipChoice.set({
    ...choice,
    voteTally: choice.voteTally + event.params.amount,
  });

  context.GrantShipsVoting.set({
    ...gsVoting,
    totalVotes: gsVoting.totalVotes + 1n,
  });
  addTransaction(event, context);
});

TimedVotes.VoteRetracted.handler(async ({ event, context }) => {
  const stemModule = await context.StemModule.get(event.srcAddress);

  if (stemModule === undefined) {
    context.log.error(
      `StemModule not found: Module address ${event.srcAddress}`
    );
    return;
  }

  if (stemModule.contestAddress === undefined) {
    context.log.error(
      `StemModule contestAddress not found: contest address ${stemModule.contestAddress}`
    );
    return;
  }

  const gsVoting = await context.GrantShipsVoting.get(
    stemModule.contestAddress
  );

  if (gsVoting === undefined) {
    context.log.error(
      `GrantShipsVoting not found: Contest address ${stemModule.contestAddress}`
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

  const vote = await context.ShipVote.get(voteId);

  if (vote === undefined) {
    context.log.error(`ShipVote not found: vote id ${voteId}`);
    return;
  }

  context.ShipVote.set({
    id: voteId,
    choice_id: choice.id,
    voter_id: event.params.voter,
    amount: event.params.amount,
    contest_id: gsVoting.id,
    token: gsVoting.voteTokenAddress,
    mdProtocol: event.params._3[0],
    mdPointer: event.params._3[1],
    isRetractVote: true,
  });

  context.ShipChoice.set({
    ...choice,
    voteTally: choice.voteTally - vote.amount,
  });

  context.GrantShipsVoting.set({
    ...gsVoting,
    totalVotes: gsVoting.totalVotes - 1n,
  });
  addTransaction(event, context);
});
