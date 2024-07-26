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
}

export enum PostDecorator {
  Update,
}

export enum ContentSchema {
  BasicUpdate, // { text: string }
  RichText, // { type: 'doc' content: Array<ContentNode> }
}

export enum Module {
  HatsAllowList_v0_1_1 = 'HatsAllowList_v0.1.1',
  TimedVotes_v0_1_1 = 'TimedVotes_v0.1.1',
  EmptyExecutionModule_v0_1_1 = 'EmptyExecution_v0.1.1',
  ERC20VotesPoints_v0_1_1 = 'ERC20VotesPoints_v0.1.1',
  SBTBalancePoints_v0_1_1 = 'SBTBalancePoints_v0.1.1',
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
  ApplicationSubmitted,
  ApplicationRejected,
  ApplicationApproved,
  MilestonesSubmitted,
  MilestonesRejected,
  MilestonesApproved,
  Building,
  Completed,
}

export enum FacilitatorApprovalStatus {
  None,
  Pending,
  Approved,
  Rejected,
}

export enum MilestoneStatus {
  None,
  Submitted,
  Rejected,
  Approved,
}

// Took out
// facilitator approve
// facilitator reject
// //
// MilestoneSubmitted,
//   MilestoneRejected,
//   MilestoneApproved,
