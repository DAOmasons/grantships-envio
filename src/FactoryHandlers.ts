import { FastFactory } from 'generated';

import { addTransaction } from './utils/sync';
import { addChainId } from './utils/id';
import { ContestVersion, Module } from './utils/constants';

/// ===============================
/// ======= FACTORY INIT ==========
/// ===============================

FastFactory.FactoryInitialized.handler(async ({ event, context }) => {
  context.FactoryEventsSummary.set({
    id: `factory-${event.chainId}-${event.srcAddress}`,
    address: event.srcAddress,
    admins: [event.params.admin],
    contestTemplateCount: 0n,
    moduleTemplateCount: 0n,
    moduleCloneCount: 0n,
    contestCloneCount: 0n,
    contestBuiltCount: 0n,
  });
});

/// ===============================
/// ======= ADMIN ADDED ===========
/// ===============================

FastFactory.AdminAdded.handler(async ({ event, context }) => {
  const summary = await context.FactoryEventsSummary.get(
    `factory-${event.chainId}-${event.srcAddress}`
  );

  if (!summary) {
    context.log.error(`Factory ${event.srcAddress} not found`);
    return;
  }

  const nextSummaryEntity = {
    ...summary,
    admins: [...summary.admins, event.params.admin],
  };

  context.FactoryEventsSummary.set(nextSummaryEntity);
  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ======= ADMIN REMOVED =========
/// ===============================

FastFactory.AdminRemoved.handler(async ({ event, context }) => {
  const summary = await context.FactoryEventsSummary.get(
    `factory-${event.chainId}-${event.srcAddress}`
  );

  if (!summary) {
    context.log.error(`Factory ${event.srcAddress} not found`);
    return;
  }

  context.FactoryEventsSummary.set({
    ...summary,
    admins: summary.admins.filter((admin) => admin !== event.params.admin),
  });
  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ==== ADD CONTEST TEMPLATE =====
/// ===============================

FastFactory.ContestTemplateCreated.handler(async ({ event, context }) => {
  const summary = await context.FactoryEventsSummary.get(
    `factory-${event.chainId}-${event.srcAddress}`
  );

  if (!summary) {
    context.log.error(`Factory ${event.srcAddress} not found`);
    return;
  }

  context.FactoryEventsSummary.set({
    ...summary,
    contestTemplateCount: summary.contestTemplateCount + 1n,
  });
  context.ContestTemplate.set({
    id: addChainId(event, event.params.contestVersion),
    contestVersion: event.params.contestVersion,
    contestAddress: event.params.contestAddress,
    mdProtocol: event.params.contestInfo[0],
    mdPointer: event.params.contestInfo[1],
    active: true,
  });
  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ==== DELETE CONTEST TEMPLATE ==
/// ===============================

FastFactory.ContestTemplateDeleted.handler(async ({ event, context }) => {
  const summary = await context.FactoryEventsSummary.get(
    `factory-${event.chainId}-${event.srcAddress}`
  );
  const contest = await context.ContestTemplate.get(
    addChainId(event, event.params.contestVersion)
  );

  if (!contest) {
    context.log.error(
      `ContestTemplate with version ${event.params.contestVersion} not found`
    );
    return;
  }

  if (!summary) {
    context.log.error(`Factory ${event.srcAddress} not found`);
    return;
  }

  context.FactoryEventsSummary.set({
    ...summary,
    contestTemplateCount: summary.contestTemplateCount - 1n,
  });

  context.ContestTemplate.set({
    ...contest,
    active: false,
  });
  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ==== ADD MODULE TEMPLATE ======
/// ===============================

FastFactory.ModuleTemplateCreated.handler(async ({ event, context }) => {
  const summary = await context.FactoryEventsSummary.get(
    `factory-${event.chainId}-${event.srcAddress}`
  );

  if (!summary) {
    context.log.error(`Factory ${event.srcAddress} not found`);
    return;
  }

  const nextSummaryEntity = {
    ...summary,
    moduleTemplateCount: summary.moduleTemplateCount + 1n,
  };

  context.FactoryEventsSummary.set(nextSummaryEntity);
  context.ModuleTemplate.set({
    id: addChainId(event, event.params.moduleName),
    templateAddress: event.params.moduleAddress,
    moduleName: event.params.moduleName,
    mdProtocol: event.params.moduleInfo[0],
    mdPointer: event.params.moduleInfo[1],
    active: true,
  });

  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// === DELETE MODULE TEMPLATE ====
/// ===============================

FastFactory.ModuleTemplateDeleted.handler(async ({ event, context }) => {
  const summary = await context.FactoryEventsSummary.get(
    `factory-${event.chainId}-${event.srcAddress}`
  );
  const newModule = await context.ModuleTemplate.get(
    addChainId(event, event.params.moduleName)
  );

  if (!summary) {
    context.log.error(`Factory ${event.srcAddress} not found`);
    return;
  }

  if (!newModule) {
    context.log.error(
      `ModuleTemplate with address ${event.params.moduleName} not found`
    );
    return;
  }

  context.FactoryEventsSummary.set({
    ...summary,
    moduleTemplateCount: summary.moduleTemplateCount - 1n,
  });
  context.ModuleTemplate.set({
    ...newModule,
    active: false,
  });
  addTransaction(event, context.Transaction.set);
});

FastFactory.ModuleCloned.contractRegister(({ event, context }) => {
  if (event.params.moduleName === Module.HatsAllowList_v0_1_1) {
    context.addHatsAllowList(event.params.moduleAddress);
  } else if (event.params.moduleName === Module.TimedVotes_v0_1_1) {
    context.addTimedVotes(event.params.moduleAddress);
  } else if (event.params.moduleName === Module.ERC20VotesPoints_v0_1_1) {
    context.addERC20VotesPoints(event.params.moduleAddress);
  } else if (event.params.moduleName === Module.SBTBalancePoints_v0_1_1) {
    context.addSBTBalancePoints(event.params.moduleAddress);
  }
});

FastFactory.ModuleCloned.handler(async ({ event, context }) => {
  const summary = await context.FactoryEventsSummary.get(
    `factory-${event.chainId}-${event.srcAddress}`
  );

  if (!summary) {
    context.log.error(`Factory ${event.srcAddress} not found`);
    return;
  }

  context.StemModule.set({
    id: event.params.moduleAddress,
    moduleAddress: event.params.moduleAddress,
    moduleName: event.params.moduleName,
    filterTag: event.params.filterTag,
    moduleTemplate_id: event.params.moduleName,
    contestAddress: undefined,
    contest_id: undefined,
  });
  context.FactoryEventsSummary.set({
    ...summary,
    moduleCloneCount: summary.moduleCloneCount + 1n,
  });

  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ======= CONTEST CLONED ========
/// ===============================

FastFactory.ContestCloned.contractRegister(async ({ event, context }) => {
  if (event.params.contestAddress === ContestVersion.v0_1_0) {
    context.addContest_v0_1_0(event.params.contestAddress);
  } else {
    console.error(`Contest ${event.params.contestAddress} not found`);
  }
});

FastFactory.ContestCloned.handler(async ({ event, context }) => {
  const summary = await context.FactoryEventsSummary.get(
    `factory-${event.chainId}-${event.srcAddress}`
  );

  if (!summary) {
    context.log.error(`Factory ${event.srcAddress} not found`);
    return;
  }

  context.FactoryEventsSummary.set({
    ...summary,
    contestCloneCount: summary.contestCloneCount + 1n,
  });
  context.ContestClone.set({
    id: event.params.contestAddress,
    contestAddress: event.params.contestAddress,
    contestVersion: event.params.contestVersion,
    filterTag: event.params.filterTag,
  });

  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ======= CONTEST BUILT =========
/// ===============================

FastFactory.ContestBuilt.handler(async ({ event, context }) => {
  const summary = await context.FactoryEventsSummary.get(
    `factory-${event.chainId}-${event.srcAddress}`
  );

  if (!summary) {
    context.log.error(`Factory ${event.srcAddress} not found`);
    return;
  }

  context.FactoryEventsSummary.set({
    ...summary,
    contestCloneCount: summary.contestBuiltCount + 1n,
  });

  addTransaction(event, context.Transaction.set);
});
