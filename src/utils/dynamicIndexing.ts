import { ContestVersion, Module } from './constants';

export const isGrantShipsVoting = ({
  choiceModuleName,
  votesModuleName,
  pointsModuleName,
  executionModuleName,
  contestVersion,
}: {
  choiceModuleName: string;
  votesModuleName: string;
  pointsModuleName: string;
  executionModuleName: string;
  contestVersion: string;
}) =>
  choiceModuleName === Module.HatsAllowList_v0_1_1 &&
  votesModuleName === Module.TimedVotes_v0_1_1 &&
  pointsModuleName === Module.ERC20VotesPoints_v0_1_1 &&
  executionModuleName === Module.EmptyExecutionModule_v0_1_1 &&
  contestVersion === ContestVersion.v0_1_0
    ? true
    : false;

export const isSBTVoting = ({
  choiceModuleName,
  votesModuleName,
  pointsModuleName,
  executionModuleName,
  contestVersion,
}: {
  choiceModuleName: string;
  votesModuleName: string;
  pointsModuleName: string;
  executionModuleName: string;
  contestVersion: string;
}) =>
  choiceModuleName === Module.HatsAllowList_v0_1_1 &&
  votesModuleName === Module.TimedVotes_v0_1_1 &&
  pointsModuleName === Module.SBTBalancePoints_v0_1_1 &&
  executionModuleName === Module.EmptyExecutionModule_v0_1_1 &&
  contestVersion === ContestVersion.v0_1_0
    ? true
    : false;

export const isDualTokenVoting = ({
  choiceModuleName,
  votesModuleName,
  pointsModuleName,
  executionModuleName,
  contestVersion,
}: {
  choiceModuleName: string;
  votesModuleName: string;
  pointsModuleName: string;
  executionModuleName: string;
  contestVersion: string;
}) =>
  choiceModuleName === Module.HatsAllowList_v0_1_1 &&
  votesModuleName === Module.DualTokenTimed_v0_0_1 &&
  pointsModuleName === Module.DualTokenPoints_v0_0_1 &&
  executionModuleName === Module.EmptyExecutionModule_v0_1_1 &&
  contestVersion === ContestVersion.v0_1_0
    ? true
    : false;
