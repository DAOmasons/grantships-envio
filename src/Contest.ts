import { Contest_v0_1_0 } from 'generated';
import {
  isDualTokenVoting,
  isGrantShipsVoting,
  isSBTVoting,
} from './utils/dynamicIndexing';
import { addTransaction } from './utils/sync';
import { ContestStatus } from './utils/constants';
import { zeroAddress } from 'viem';

Contest_v0_1_0.ContestInitialized.handler(async ({ event, context }) => {
  const contestClone = await context.ContestClone.get(event.srcAddress);
  const votingModule = await context.StemModule.get(event.params.votesModule);
  const pointsModule = await context.StemModule.get(event.params.pointsModule);
  const choicesModule = await context.StemModule.get(
    event.params.choicesModule
  );
  const executionModule = await context.StemModule.get(
    event.params.executionModule
  );

  const halParams = await context.HALParams.get(event.params.choicesModule);
  const tvParams = await context.TVParams.get(event.params.votesModule);
  const ercPointParams = await context.ERCPointParams.get(
    event.params.pointsModule
  );

  const sbtBalParams = await context.SBTBalParams.get(
    event.params.pointsModule
  );

  const dualTokenPointsParams = await context.DualTokenPointsParams.get(
    event.params.pointsModule
  );

  if (
    contestClone === undefined ||
    votingModule === undefined ||
    pointsModule === undefined ||
    choicesModule === undefined ||
    executionModule === undefined
  ) {
    if (contestClone === undefined)
      context.log.error(
        `ContestClone not found: Contest address ${event.srcAddress}`
      );
    if (votingModule === undefined)
      context.log.error(
        `VotingModule not found: Module address ${event.params.votesModule}`
      );
    if (pointsModule === undefined)
      context.log.error(
        `PointsModule not found: Module address ${event.params.pointsModule}`
      );
    if (choicesModule === undefined)
      context.log.error(
        `ChoicesModule not found: Module address ${event.params.choicesModule}`
      );
    if (executionModule === undefined)
      context.log.error(
        `ExecutionModule not found: Module address ${event.params.executionModule}`
      );

    return;
  }

  context.StemModule.set({
    ...executionModule,
    contestAddress: contestClone.contestAddress,
    contest_id: contestClone.contestAddress,
  });

  context.StemModule.set({
    ...votingModule,
    contestAddress: contestClone.contestAddress,
    contest_id: contestClone.contestAddress,
  });

  context.StemModule.set({
    ...pointsModule,
    contestAddress: contestClone.contestAddress,
    contest_id: contestClone.contestAddress,
  });

  context.StemModule.set({
    ...choicesModule,
    contestAddress: contestClone.contestAddress,
    contest_id: contestClone.contestAddress,
  });

  context.Contest.set({
    id: contestClone.contestAddress,
    contestAddress: contestClone.contestAddress,
    contestVersion: contestClone.contestVersion,
    filterTag: contestClone.filterTag,
    contestStatus: event.params.status,
    votesModule_id: event.params.votesModule,
    pointsModule_id: event.params.pointsModule,
    choicesModule_id: event.params.choicesModule,
    executionModule_id: event.params.executionModule,
    isContinuous: event.params.isContinuous,
    isRetractable: event.params.isRetractable,
  });

  if (
    isGrantShipsVoting({
      choiceModuleName: choicesModule.moduleName,
      votesModuleName: votingModule.moduleName,
      pointsModuleName: pointsModule.moduleName,
      executionModuleName: executionModule.moduleName,
      contestVersion: contestClone.contestVersion,
    })
  ) {
    if (
      halParams === undefined ||
      tvParams === undefined ||
      ercPointParams === undefined
    ) {
      if (halParams === undefined)
        context.log.error(
          `HALParams not found: ID ${event.params.choicesModule}`
        );
      if (tvParams === undefined)
        context.log.error(`TVParams not found: ID ${event.params.votesModule}`);

      if (ercPointParams === undefined) {
        context.log.error(
          `ERCPointParams not found: ID ${event.params.pointsModule}, `
        );
      }
      return;
    }

    context.GrantShipsVoting.set({
      id: event.srcAddress,
      contest_id: contestClone.contestAddress,
      hatId: halParams.hatId,
      hatsAddress: halParams.hatsAddress,
      voteTokenAddress: ercPointParams.voteTokenAddress,
      votingCheckpoint: ercPointParams.votingCheckpoint,
      voteDuration: tvParams.voteDuration,
      startTime: undefined,
      endTime: undefined,
      isVotingActive: false,
      isSBTVoting: false,
      isDualToken: false,
      totalVotes: 0n,
    });

    addTransaction(event, context);
    return;
  }

  if (
    isSBTVoting({
      choiceModuleName: choicesModule.moduleName,
      votesModuleName: votingModule.moduleName,
      pointsModuleName: pointsModule.moduleName,
      executionModuleName: executionModule.moduleName,
      contestVersion: contestClone.contestVersion,
    })
  ) {
    if (
      halParams === undefined ||
      tvParams === undefined ||
      sbtBalParams === undefined
    ) {
      if (halParams === undefined)
        context.log.error(
          `HALParams not found: ID ${event.params.choicesModule}`
        );
      if (tvParams === undefined)
        context.log.error(`TVParams not found: ID ${event.params.votesModule}`);

      if (sbtBalParams === undefined) {
        context.log.error(
          `SBTBalParams not found: ID ${event.params.pointsModule}, `
        );
      }
      return;
    }
    context.GrantShipsVoting.set({
      id: event.srcAddress,
      contest_id: contestClone.contestAddress,
      hatId: halParams.hatId,
      hatsAddress: halParams.hatsAddress,
      voteTokenAddress: sbtBalParams.voteTokenAddress,
      votingCheckpoint: 0n,
      voteDuration: tvParams.voteDuration,
      startTime: undefined,
      endTime: undefined,
      isVotingActive: false,
      isSBTVoting: true,
      isDualToken: false,
      totalVotes: 0n,
    });
    addTransaction(event, context);
    return;
  }

  if (
    isDualTokenVoting({
      choiceModuleName: choicesModule.moduleName,
      votesModuleName: votingModule.moduleName,
      pointsModuleName: pointsModule.moduleName,
      executionModuleName: executionModule.moduleName,
      contestVersion: contestClone.contestVersion,
    })
  ) {
    if (
      halParams === undefined ||
      tvParams === undefined ||
      dualTokenPointsParams === undefined
    ) {
      if (halParams === undefined)
        context.log.error(
          `HALParams not found: ID ${event.params.choicesModule}`
        );
      if (tvParams === undefined)
        context.log.error(`TVParams not found: ID ${event.params.votesModule}`);
      if (dualTokenPointsParams === undefined)
        context.log.error(
          `DualTokenPointsParams not found: ID ${event.params.pointsModule}, `
        );
      return;
    }

    context.GrantShipsVoting.set({
      id: event.srcAddress,
      contest_id: contestClone.contestAddress,
      hatId: halParams.hatId,
      hatsAddress: halParams.hatsAddress,
      voteTokenAddress: zeroAddress,
      votingCheckpoint: dualTokenPointsParams.votingCheckpoint,
      voteDuration: tvParams.voteDuration,
      startTime: undefined,
      endTime: undefined,
      isVotingActive: false,
      isSBTVoting: false,
      isDualToken: true,
      totalVotes: 0n,
    });
    addTransaction(event, context);
    return;
  }
});

Contest_v0_1_0.ContestStatusChanged.handler(async ({ event, context }) => {
  const contest = await context.Contest.get(event.srcAddress);
  const grantShipsVoting = await context.GrantShipsVoting.get(event.srcAddress);
  if (contest === undefined) {
    context.log.error(
      `GrantShipsVoting not found: Contest address ${event.srcAddress}`
    );
    return;
  }

  context.Contest.set({
    ...contest,
    contestStatus: event.params.status,
  });

  if (Number(event.params.status) === ContestStatus.Finalized) {
    if (grantShipsVoting === undefined) {
      context.log.error(
        `GrantShipsVoting not found: Contest address ${event.srcAddress}`
      );
      return;
    }

    context.GrantShipsVoting.set({
      ...grantShipsVoting,
      isVotingActive: false,
    });
  }

  addTransaction(event, context);
});
