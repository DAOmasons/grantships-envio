import { DualTokenTimedV0 } from 'generated';
import { addTransaction } from './utils/sync';
import { createChoiceId, createVoteId } from './utils/id';

DualTokenTimedV0.Initialized.handler(async ({ event, context }) => {
  context.TVParams.set({
    id: event.srcAddress,
    voteDuration: event.params.duration,
  });
});
//

DualTokenTimedV0.VotingStarted.handler(async ({ event, context }) => {
  const stemModule = await context.StemModule.get(event.srcAddress);

  if (!stemModule) {
    context.log.error(
      `StemModule not found: Module address ${event.srcAddress}`
    );
    return;
  }

  if (!stemModule.contestAddress) {
    context.log.error(
      `StemModule contestAddress not found: contest address ${stemModule.contestAddress}`
    );
    return;
  }

  const gsVoting = await context.GrantShipsVoting.get(
    stemModule.contestAddress
  );

  if (!gsVoting) {
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

DualTokenTimedV0.VoteCast.handler(async ({ event, context }) => {
  const stemModule = await context.StemModule.get(event.srcAddress);
  const params = await context.DualTokenTVParams.get(event.srcAddress);
  if (!stemModule || !params) {
    context.log.error(
      `StemModule or Params not found: Module address ${event.srcAddress}`
    );
    return;
  }

  if (!stemModule.contestAddress) {
    context.log.error(
      `StemModule contestAddress not found: contest address ${stemModule.contestAddress}`
    );
    return;
  }

  const gsVoting = await context.GrantShipsVoting.get(
    stemModule.contestAddress
  );

  if (!gsVoting) {
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
    mdProtocol: event.params.reason[0],
    mdPointer: event.params.reason[1],
    token: event.params.votingToken,
    isRetractVote: false,
  });

  context.GSVoter.set({
    id: event.params.voter,
    address: event.params.voter,
  });

  context.GrantShipsVoting.set({
    ...gsVoting,
    totalVotes: gsVoting.totalVotes + 1n,
  });

  if (params.daoTokenAddress === event.params.votingToken) {
    context.ShipChoice.set({
      ...choice,
      daoTokenTally: choice.daoTokenTally + event.params.amount,
    });
  } else if (params.contextTokenAddress === event.params.votingToken) {
    context.ShipChoice.set({
      ...choice,
      contextTokenTally: choice.contextTokenTally + event.params.amount,
    });
  } else {
    context.log.error(`Token not found: ${event.params.votingToken}`);
    return;
  }
  addTransaction(event, context);
});

DualTokenTimedV0.VoteRetracted.handler(async ({ event, context }) => {
  const module = await context.StemModule.get(event.srcAddress);
  const params = await context.DualTokenTVParams.get(event.srcAddress);
  if (!module || !params) {
    context.log.error(
      `StemModule or Params not found: Module address ${event.srcAddress}`
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

  const vote = await context.ShipVote.get(voteId);
  if (vote === undefined) {
    context.log.error(`ShipVote not found: vote id ${vote}`);
    return;
  }
  context.ShipVote.set({
    id: voteId,
    choice_id: choice.id,
    voter_id: event.params.voter,
    amount: event.params.amount,
    contest_id: gsVoting.id,
    token: event.params.votingToken,
    mdProtocol: event.params.reason[0],
    mdPointer: event.params.reason[1],
    isRetractVote: true,
  });

  context.GrantShipsVoting.set({
    ...gsVoting,
    totalVotes: gsVoting.totalVotes - 1n,
  });

  if (params.daoTokenAddress === event.params.votingToken) {
    context.ShipChoice.set({
      ...choice,
      daoTokenTally: choice.daoTokenTally - event.params.amount,
    });
  } else if (params.contextTokenAddress === event.params.votingToken) {
    context.ShipChoice.set({
      ...choice,
      contextTokenTally: choice.contextTokenTally - event.params.amount,
    });
  } else {
    context.log.error(`Token not found: ${event.params.votingToken}`);
    return;
  }
  addTransaction(event, context);
});
