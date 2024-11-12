// import { GameManagerFactory } from 'generated';
// import { addTransaction } from './utils/sync';

// GameManagerFactory.FactoryInitialized.handler(async ({ event, context }) => {
//   context.GameManagerFactory.set({
//     id: event.srcAddress,
//     rootAccount: event.params.rootAccount,
//     chainId: event.chainId,
//     createdAt: event.block.timestamp,
//   });

//   addTransaction(event, context);
// });

// GameManagerFactory.TemplateCreated.handler(async ({ event, context }) => {
//   context.GameManagerTemplate.set({
//     id: event.params.name,
//     name: event.params.name,
//     address: event.params.templateAddress,
//     chainId: event.chainId,
//     createdAt: event.block.timestamp,
//   });

//   addTransaction(event, context);
// });

// GameManagerFactory.RootAccountSwitched.handler(async ({ event, context }) => {
//   const gmFactory = await context.GameManagerFactory.get(event.srcAddress);

//   if (!gmFactory) {
//     return;
//   }

//   context.GameManagerFactory.set({
//     ...gmFactory,
//     rootAccount: event.params.newRootAccount,
//   });

//   addTransaction(event, context);
// });

// GameManagerFactory.GameManagerDeployedWithPool.contractRegister(
//   ({ event, context }) => {
//     context.addGameManagerStrategy(event.params.gameManagerAddress);
//   }
// );

// GameManagerFactory.GameManagerDeployedWithPool.handler(
//   async ({ event, context }) => {
//     const gmInitParams = await context.GMInitParams.get(
//       event.params.gameManagerAddress
//     );

//     if (!gmInitParams) {
//       return;
//     }

//     context.GameManager.set({
//       id: event.params.gameManagerAddress,
//       template_id: event.params.templateName,
//       poolId: event.params.poolId,
//       profileId: event.params.profileId,
//       chainId: event.chainId,
//       createdAt: event.block.timestamp,
//       tokenAddress: event.params.tokenAddress,
//       currentRoundNumber: BigInt(0),
//       poolMetadataProtocol: event.params.poolMetadata[0],
//       poolMetadataPointer: event.params.poolMetadata[1],
//       profileMetadataProtocol: event.params.profileMetadata[0],
//       profileMetadataPointer: event.params.profileMetadata[1],
//       initData: event.params.initData,
//       gameFacilitatorId: gmInitParams.gameFacilitatorId,
//       poolFunds: undefined,
//       currentRound_id: undefined,
//       gmRootAccount: gmInitParams.gmRootAccount,
//     });

//     addTransaction(event, context);
//   }
// );
