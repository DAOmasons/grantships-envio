import { eventLog, handlerContext } from 'generated';
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
  `${tag}-${event.transaction.hash}-${event.logIndex}`;

export const addFeedCard = ({
  event,
  tag,
  domain,
  subject,
  embed,
  object,
  richTextContent,
  message,
  context,
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
  context: handlerContext;
}) => {
  const cardId = feedCardId(tag, event);

  // Set Subject
  context.FeedItemEntity.set({
    id: subject.id,
    name: subject.name,
    playerType: subject.playerType,
  });

  if (embed) {
    context.FeedItemEmbed.set({
      id: `feed-embed-${cardId}`,
      key: embed.key,
      pointer: embed.pointer,
      protocol: embed.protocol,
      content: embed.content,
    });
  }

  if (object) {
    context.FeedItemEntity.set({
      id: object.id,
      name: object.name,
      playerType: object.playerType,
    });
  }

  if (richTextContent) {
    context.RawMetadata.set({
      id: richTextContent.pointer,
      protocol: richTextContent.protocol,
      pointer: richTextContent.pointer,
    });
  }

  context.FeedCard.set({
    id: cardId,
    timestamp: event.block.timestamp,
    message,
    richTextContent_id: richTextContent?.pointer || undefined,
    sender: event.transaction.from,
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
