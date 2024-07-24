import { AlloPosterContract } from 'generated';
import {
  ContentSchema,
  PostDecorator,
  Player,
  UpdateScope,
} from './utils/constants';
import { addTransaction } from './utils/sync';

AlloPosterContract.PostEvent.loader(({ event, context }) => {
  context.Project.load(event.params.anchor, {});
});

AlloPosterContract.PostEvent.handler(({ event, context }) => {
  const project = context.Project.get(event.params.anchor);

  if (event.params.tag.startsWith('TAG')) {
    const [, action, postId] = event.params.tag.split(':');

    if (!action || !postId) {
      return;
    }

    if (action === 'PROJECT_POST') {
      if (!project) {
        return;
      }

      const [postType, , postIndex] = postId.split('-');

      if (!postType || !postIndex) {
        return;
      }

      if (postType === 'richtext/post') {
        context.RawMetadata.set({
          id: event.params._2[1],
          protocol: event.params._2[0],
          pointer: event.params._2[1],
        });

        context.Update.set({
          id: `project-post-${event.params.anchor}-${postIndex}`,
          scope: UpdateScope.Project,
          tag: postType,
          playerType: Player.Project,
          domain_id: undefined,
          entityAddress: project.id,
          entityMetadata_id: project.metadata_id,
          postedBy: event.txOrigin,
          content_id: event.params._2[1],
          contentSchema: ContentSchema.RichText,
          postDecorator: undefined,
          timestamp: event.blockTimestamp,
          postBlockNumber: event.blockNumber,
          chainId: event.chainId,
        });

        addTransaction(event, context.Transaction.set);

        return;
      }
    }
  }
});
