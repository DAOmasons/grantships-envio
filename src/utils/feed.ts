import {
  eventLog,
  feedCardEntity,
  feedItemEmbedEntity,
  feedItemEntityEntity,
  rawMetadataEntity,
} from 'generated';
import { Player } from './constants';

type Object = {
  id: string;
  playerType: Player;
  name: string;
};

type Subject = Object & {
  pointer: string;
};

type Embed = {
  key?: string;
  pointer?: string;
  protocol?: bigint;
  content?: string;
};

export const feedCardId = (tag: string, event: eventLog<unknown>) =>
  `${tag}-${event.transactionHash}-${event.logIndex}`;

export const addFeedCard = ({
  event,
  tag,
  domain,
  subject,
  embed,
  object,
  richTextContent,
  message,
  setEntity,
  setCard,
  setEmbed,
  setMetadata,
  internalLink,
  externalLink,
}: {
  message?: string;
  tag: string;
  domain: string;
  event: eventLog<unknown>;
  subject: Subject;
  object?: Object;
  embed?: Embed;
  richTextContent?: {
    protocol: bigint;
    pointer: string;
  };
  internalLink?: string;
  externalLink?: string;
  setCard: (_1: feedCardEntity) => void;
  setEntity: (_1: feedItemEntityEntity) => void;
  setEmbed: (_1: feedItemEmbedEntity) => void;
  setMetadata: (_1: rawMetadataEntity) => void;
}) => {
  const cardId = feedCardId(tag, event);

  // Set Subject
  setEntity({
    id: subject.id,
    name: subject.name,
    playerType: subject.playerType,
  });

  if (embed) {
    setEmbed({
      id: `feed-embed-${cardId}`,
      key: embed.key,
      pointer: embed.pointer,
      protocol: embed.protocol,
      content: embed.content,
    });
  }

  if (object) {
    setEntity({
      id: object.id,
      name: object.name,
      playerType: object.playerType,
    });
  }

  if (richTextContent) {
    setMetadata({
      id: richTextContent.pointer,
      protocol: richTextContent.protocol,
      pointer: richTextContent.pointer,
    });
  }

  setCard({
    id: cardId,
    timestamp: event.blockTimestamp,
    message,
    richTextContent_id: richTextContent?.pointer || undefined,
    sender: event.txOrigin,
    tag,
    subject_id: subject.id,
    object_id: object?.id || undefined,
    embed_id: embed ? `feed-embed-${cardId}` : undefined,
    domain_id: domain,
    subjectMetadataPointer: subject.pointer,
    internalLink,
    externalLink,
  });
};

export const inWeiMarker = (value: BigInt): string => {
  return `##IN-WEI${value}##`;
};
