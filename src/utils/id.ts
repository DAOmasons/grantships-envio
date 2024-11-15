import { eventLog } from 'generated';

export const createChoiceId = ({
  contestAddress,
  choiceId,
}: {
  contestAddress: string;
  choiceId: string;
}) => `choice-${choiceId}-${contestAddress}`;

export const createVoteId = (event: eventLog<unknown>) =>
  `vote-${event.transaction.hash}-${event.logIndex}`;

export const addChainId = (event: eventLog<unknown>, id: string) => {
  return `${id}-${event.chainId}`;
};

export const _grantId = ({
  projectId,
  shipSrc,
}: {
  projectId: string;
  shipSrc: string;
}) => `grant-${projectId}-${shipSrc}`;

export const _applicationId = ({
  projectId,
  shipSrc,
  index,
}: {
  projectId: string;
  shipSrc: string;
  index: number;
}) => `application-${projectId}-${shipSrc}-${index}`;

export const _milestoneSetId = ({
  projectId,
  shipSrc,
  index,
}: {
  projectId: string;
  shipSrc: string;
  index: number;
}) => `milestone-set-${projectId}-${shipSrc}-${index}`;

export const _milestoneId = ({
  projectId,
  shipSrc,
  setIndex,
  index,
}: {
  projectId: string;
  shipSrc: string;
  setIndex: number;
  index: number;
}) => `milestone-${projectId}-${shipSrc}-${setIndex}-${index}`;
