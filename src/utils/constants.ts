export enum GameStatus {
  None,
  Pending,
  Accepted,
  Rejected,
  Allocated,
  Funded,
  Active,
  Completed,
}

export enum UpdateScope {
  Game,
  Ship,
  Project,
  Grant,
}

export enum Player {
  Project,
  Ship,
  GameFacilitator,
  System,
}

export enum PostDecorator {
  Update,
}

export enum ContentSchema {
  BasicUpdate, // { text: string }
  RichText, // { type: 'doc' content: Array<ContentNode> }
  Reason, // { reason: string }
}

export enum Module {
  HatsAllowList_v0_1_1 = 'HatsAllowList_v0.1.1',
  TimedVotes_v0_1_1 = 'TimedVotes_v0.1.1',
  EmptyExecutionModule_v0_1_1 = 'EmptyExecution_v0.1.1',
  ERC20VotesPoints_v0_1_1 = 'ERC20VotesPoints_v0.1.1',
  SBTBalancePoints_v0_1_1 = 'SBTBalancePoints_v0.1.1',
  DualTokenPoints_v0_0_1 = 'DualTokenPoints_v0.0.1',
  DualTokenTimed_v0_0_1 = 'DualTokenTimed_v0.0.1',
}

export enum ContestVersion {
  v0_1_0 = '0.1.0',
}

export enum ContestStatus {
  None,
  Populating,
  Voting,
  Continuous,
  Finalized,
  Executed,
}

export enum GrantStatus {
  None,
  ProjectInitiated,
  ShipInitiated,
  ApplicationSubmitted,
  ApplicationRejected,
  ApplicationApproved,
  MilestonesSubmitted,
  MilestonesRejected,
  MilestonesApproved,
  FacilitatorRejected,
  Allocated,
  AllMilestonesComplete,
  Completed,
}

// Took out
// facilitator approve
// facilitator reject
// //
// MilestoneSubmitted,
//   MilestoneRejected,
//   MilestoneApproved,
