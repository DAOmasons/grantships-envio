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
}

export enum PostDecorator {
  Update,
}

export enum ContentSchema {
  BasicUpdate, // { text: string }
}
