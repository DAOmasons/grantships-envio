import {
  eventLog,
  feedCardEntity,
  feedItemEmbedEntity,
  feedItemEntityEntity,
  rawMetadataEntity,
} from 'generated';

type Object = {
  id: string;
  type: string;
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
  `${tag}-${event.transactionHash}-${event.transactionIndex}`;

export const addFeedCard = ({
  event,
  tag,
  domain,
  subject,
  embed,
  object,
  content,
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
  content?: {
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
    entityType: subject.type,
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
      entityType: object.type,
    });
  }

  if (content) {
    setMetadata({
      id: content.pointer,
      protocol: content.protocol,
      pointer: content.pointer,
    });
  }

  setCard({
    id: cardId,
    timestamp: event.blockTimestamp,
    message,
    content_id: content?.pointer || undefined,
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
