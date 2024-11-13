import { Registry } from 'generated';
import { GameStatus } from './utils/constants';
import { addTransaction } from './utils/sync';

Registry.ProfileCreated.handler(async ({ event, context }) => {
  if (event.params.metadata[0] == 103115010001003n) {
    context.RawMetadata.set({
      id: event.params.metadata[1],
      protocol: event.params.metadata[0],
      pointer: event.params.metadata[1],
    });

    context.Project.set({
      id: event.params.anchor,
      chainId: event.chainId,
      profileId: event.params.profileId,
      status: GameStatus.None,
      nonce: event.params.nonce,
      name: event.params.name,
      metadata_id: event.params.metadata[1],
      owner: event.params.owner,
      anchor: event.params.anchor,
      members_id: event.params.profileId,
      totalAmountReceived: BigInt(0),
      pastProfileIds: [],
      pastNames: [],
      hasEditedProfile: false,
    });

    context.ProfileIdToAnchor.set({
      id: event.params.profileId,
      profileId: event.params.profileId,
      anchor: event.params.anchor,
    });

    addTransaction(event, context);
  }
  if (event.params.metadata[0] == 103115010001004n) {
    context.RawMetadata.set({
      id: event.params.metadata[1],
      protocol: event.params.metadata[0],
      pointer: event.params.metadata[1],
    });

    context.GrantShip.set({
      id: event.params.anchor,
      profileId: event.params.profileId,
      chainId: event.chainId,
      name: event.params.name,
      nonce: event.params.nonce,
      anchor: event.params.anchor,
      profileMetadata_id: event.params.metadata[1],
      pastProfileIds: [],
      pastNames: [],
      hasEditedProfile: false,
      owner: event.params.owner,
      status: GameStatus.None,
      poolFunded: false,
      alloProfileMembers_id: event.params.profileId,
      balance: BigInt(0),
      shipAllocation: BigInt(0),
      totalFundsReceived: BigInt(0),
      totalRoundAmount: BigInt(0),
      totalAllocated: BigInt(0),
      totalDistributed: BigInt(0),
      gameRound_id: undefined,
      gameManager_id: undefined,
      shipApplicationBytesData: undefined,
      applicationSubmittedTime: undefined,
      isAwaitingApproval: undefined,
      hasSubmittedApplication: undefined,
      isApproved: undefined,
      approvedTime: undefined,
      isRejected: undefined,
      rejectedTime: undefined,
      applicationReviewReason_id: undefined,
      poolId: undefined,
      hatId: undefined,
      shipContractAddress: undefined,
      shipLaunched: undefined,
      poolActive: undefined,
      isAllocated: undefined,
      isDistributed: undefined,
      beaconMessage_id: undefined,
      customApplication_id: undefined,
      beaconLastUpdated: undefined,
    });

    context.ProfileIdToAnchor.set({
      id: event.params.profileId,
      profileId: event.params.profileId,
      anchor: event.params.anchor,
    });

    addTransaction(event, context);
  }
});

Registry.RoleGranted.handler(async ({ event, context }) => {
  const profile = await context.ProfileMemberGroup.get(event.params.role);

  if (!profile) {
    context.ProfileMemberGroup.set({
      id: event.params.role,
      role: event.params.role,
      addresses: [event.params.account],
    });
  } else {
    context.ProfileMemberGroup.set({
      ...profile,
      addresses: [...profile.addresses, event.params.account],
    });
  }
});

Registry.RoleRevoked.handler(async ({ event, context }) => {
  const profile = await context.ProfileMemberGroup.get(event.params.role);

  if (!profile) {
    return;
  }

  const addresses = profile.addresses.filter(
    (address) => address != event.params.account
  );

  context.ProfileMemberGroup.set({
    ...profile,
    addresses,
  });
});

Registry.ProfileMetadataUpdated.handler(async ({ event, context }) => {
  const profileJoin = await context.ProfileIdToAnchor.get(
    event.params.profileId
  );

  if (!profileJoin) {
    // don't issue a warning here, as this is a common case
    return;
  }

  const project = await context.Project.get(profileJoin.anchor);

  if (project) {
    const hasNameChange = event.params.metadata[1].includes('##name##');

    if (hasNameChange) {
      const pointer = event.params.metadata[1].split('##name##')[0];
      const name = event.params.metadata[1].split('##name##')[1];

      context.RawMetadata.set({
        id: pointer,
        protocol: event.params.metadata[0],
        pointer,
      });
      context.Project.set({
        ...project,
        name,
        metadata_id: pointer,
        hasEditedProfile: true,
        pastProfileIds: [...project.pastProfileIds, project.profileId],
        pastNames: [...project.pastNames, project.name],
      });
      addTransaction(event, context);
    } else {
      context.RawMetadata.set({
        id: event.params.metadata[1],
        protocol: event.params.metadata[0],
        pointer: event.params.metadata[1],
      });

      context.Project.set({
        ...project,
        metadata_id: event.params.metadata[1],
        pastProfileIds: [...project.pastProfileIds, project.profileId],
        hasEditedProfile: true,
      });
      addTransaction(event, context);
    }
  }

  const ship = await context.GrantShip.get(profileJoin.anchor);

  if (ship) {
    const hasNameChange = event.params.metadata[1].includes('##name##');

    if (hasNameChange) {
      const pointer = event.params.metadata[1].split('##name##')[0];
      const name = event.params.metadata[1].split('##name##')[1];

      context.GrantShip.set({
        ...ship,
        name,
        profileMetadata_id: pointer,
        pastProfileIds: [...ship.pastProfileIds, ship.profileId],
        hasEditedProfile: true,
      });
      addTransaction(event, context);
    } else {
      context.GrantShip.set({
        ...ship,
        profileMetadata_id: event.params.metadata[1],
        pastProfileIds: [...ship.pastProfileIds, ship.profileId],
        hasEditedProfile: true,
      });
      addTransaction(event, context);
    }
  }
});
