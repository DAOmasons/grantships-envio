import { AlloPosterContract } from 'generated';
import { ContentSchema, Player, UpdateScope } from './utils/constants';
import { addTransaction } from './utils/sync';
import { addFeedCard } from './utils/feed';
import { isAddress } from 'viem';

AlloPosterContract.PostEvent.loader(({ event, context }) => {
  context.Project.load(event.params.anchor, {});
});

AlloPosterContract.PostEvent.handler(({ event, context }) => {
  const project = context.Project.get(event.params.anchor);

  if (!project) {
    context.log.error(`Project not found: ${event.params.anchor}`);
    return;
  }

  if (event.params.tag.startsWith('TAG')) {
    const [, action, possibleDomainAddress] = event.params.tag.split(':');

    if (!action) {
      context.log.warn('No action found in tag');
      return;
    }
    const isCorrectDomain =
      isAddress(possibleDomainAddress) || possibleDomainAddress === 'Global';

    if (!isCorrectDomain) {
      // context.log.warn(`Invalid domain address: ${possibleDomainAddress}`);
      return;
    }

    if (action === 'PROJECT_POST') {
      context.RawMetadata.set({
        id: event.params._2[1],
        protocol: event.params._2[0],
        pointer: event.params._2[1],
      });

      const postId = `project-post-${event.transactionHash}-${event.logIndex}`;

      context.Update.set({
        id: postId,
        scope: UpdateScope.Project,
        tag: 'project/post',
        playerType: Player.Project,
        domain_id: possibleDomainAddress,
        entityAddress: project.id,
        entityMetadata_id: project.metadata_id,
        postedBy: event.txOrigin,
        message: undefined,
        content_id: event.params._2[1],
        contentSchema: ContentSchema.RichText,
        postDecorator: undefined,
        timestamp: event.blockTimestamp,
        postBlockNumber: event.blockNumber,
        chainId: event.chainId,
        hostEntityId: project.id,
      });

      addTransaction(event, context.Transaction.set);

      addFeedCard({
        message: undefined,
        tag: 'project/post',
        domain: possibleDomainAddress,
        event,
        richTextContent: {
          protocol: event.params._2[0],
          pointer: event.params._2[1],
        },
        subject: {
          id: project.id,
          playerType: Player.Project,
          name: project.name,
          pointer: project.metadata_id,
        },
        setCard: context.FeedCard.set,
        setEntity: context.FeedItemEntity.set,
        setEmbed: context.FeedItemEmbed.set,
        setMetadata: context.RawMetadata.set,
        internalLink: `/post/${postId}`,
      });
    } else {
      context.log.warn(`Unknown action: ${action}`);
    }
  }
});
