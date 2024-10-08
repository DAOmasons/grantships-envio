import {
  FastFactoryContract,
  FactoryEventsSummaryEntity,
  ContestTemplateEntity,
} from 'generated';

import {
  indexContestVersionFactory,
  indexerModuleFactory,
} from './utils/dynamicIndexing';
import { addTransaction } from './utils/sync';
import { addChainId } from './utils/id';

export const FACTORY_EVENTS_SUMMARY_KEY = 'GlobalEventsSummary';
const FACTORY_ADDRESS = '0x3a190e45f300cbb8AB1153a90b23EE3333b02D9d';

const FACTORY_EVENTS_SUMMARY: FactoryEventsSummaryEntity = {
  id: FACTORY_EVENTS_SUMMARY_KEY,
  address: FACTORY_ADDRESS,
  admins: [],
  contestTemplateCount: 0n,
  moduleTemplateCount: 0n,
  moduleCloneCount: 0n,
  contestBuiltCount: 0n,
  contestCloneCount: 0n,
};

/// ===============================
/// ======= FACTORY INIT ==========
/// ===============================

FastFactoryContract.FactoryInitialized.loader(({ context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
});

FastFactoryContract.FactoryInitialized.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const admin = event.params.admin;

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  context.FactoryEventsSummary.set({
    ...currentSummaryEntity,
    admins: [...currentSummaryEntity.admins, admin],
  });
});

/// ===============================
/// ======= ADMIN ADDED ===========
/// ===============================

FastFactoryContract.AdminAdded.loader(({ context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
});

FastFactoryContract.AdminAdded.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  const newAdmin = event.params.admin;

  const nextSummaryEntity = {
    ...currentSummaryEntity,
    admins: [...currentSummaryEntity.admins, newAdmin],
  };

  context.FactoryEventsSummary.set(nextSummaryEntity);
  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ======= ADMIN REMOVED =========
/// ===============================

FastFactoryContract.AdminRemoved.loader(({ context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
});

FastFactoryContract.AdminRemoved.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  const removedAdmin = event.params.admin;

  const nextSummaryEntity = {
    ...currentSummaryEntity,
    admins: currentSummaryEntity.admins.filter(
      (admin) => admin !== removedAdmin
    ),
  };

  context.FactoryEventsSummary.set(nextSummaryEntity);
  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ==== ADD CONTEST TEMPLATE =====
/// ===============================

FastFactoryContract.ContestTemplateCreated.loader(({ context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
});

FastFactoryContract.ContestTemplateCreated.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  const nextSummaryEntity = {
    ...currentSummaryEntity,
    contestTemplateCount: currentSummaryEntity.contestTemplateCount + 1n,
  };

  const contestTemplate: ContestTemplateEntity = {
    id: addChainId(event, event.params.contestVersion),
    contestVersion: event.params.contestVersion,
    contestAddress: event.params.contestAddress,
    mdProtocol: event.params.contestInfo[0],
    mdPointer: event.params.contestInfo[1],
    active: true,
  };

  context.FactoryEventsSummary.set(nextSummaryEntity);
  context.ContestTemplate.set(contestTemplate);
  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ==== DELETE CONTEST TEMPLATE ==
/// ===============================

FastFactoryContract.ContestTemplateDeleted.loader(({ event, context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
  context.ContestTemplate.load(addChainId(event, event.params.contestVersion));
});

FastFactoryContract.ContestTemplateDeleted.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  const nextSummaryEntity = {
    ...currentSummaryEntity,
    contestTemplateCount: currentSummaryEntity.contestTemplateCount - 1n,
  };

  const contest = context.ContestTemplate.get(
    addChainId(event, event.params.contestVersion)
  );

  if (!contest) {
    context.log.error(
      `ContestTemplate with version ${event.params.contestVersion} not found`
    );
    return;
  }

  const deletedContestTemplate: ContestTemplateEntity = {
    ...contest,
    active: false,
  };

  context.FactoryEventsSummary.set(nextSummaryEntity);
  context.ContestTemplate.set(deletedContestTemplate);
  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ==== ADD MODULE TEMPLATE ======
/// ===============================

FastFactoryContract.ModuleTemplateCreated.loader(({ context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
});

FastFactoryContract.ModuleTemplateCreated.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  const nextSummaryEntity = {
    ...currentSummaryEntity,
    moduleTemplateCount: currentSummaryEntity.moduleTemplateCount + 1n,
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

FastFactoryContract.ModuleTemplateDeleted.loader(({ event, context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
  context.ModuleTemplate.load(addChainId(event, event.params.moduleName));
});

FastFactoryContract.ModuleTemplateDeleted.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  const nextSummaryEntity = {
    ...currentSummaryEntity,
    moduleTemplateCount: currentSummaryEntity.moduleTemplateCount - 1n,
  };

  const newModule = context.ModuleTemplate.get(
    addChainId(event, event.params.moduleName)
  );

  if (!newModule) {
    context.log.error(
      `ModuleTemplate with address ${event.params.moduleName} not found`
    );
    return;
  }

  context.FactoryEventsSummary.set(nextSummaryEntity);
  context.ModuleTemplate.set({
    ...newModule,
    active: false,
  });
  addTransaction(event, context.Transaction.set);
});

FastFactoryContract.ModuleCloned.loader(({ event, context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
  indexerModuleFactory(event, context);
});

FastFactoryContract.ModuleCloned.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  const nextSummaryEntity = {
    ...currentSummaryEntity,
    moduleCloneCount: currentSummaryEntity.moduleCloneCount + 1n,
  };

  context.StemModule.set({
    id: event.params.moduleAddress,
    moduleAddress: event.params.moduleAddress,
    moduleName: event.params.moduleName,
    filterTag: event.params.filterTag,
    moduleTemplate_id: event.params.moduleName,
    contestAddress: undefined,
    contest_id: undefined,
  });
  context.FactoryEventsSummary.set(nextSummaryEntity);
  addTransaction(event, context.Transaction.set);
});

/// ===============================
/// ======= CONTEST CLONED ========
/// ===============================

FastFactoryContract.ContestCloned.loader(({ event, context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
  indexContestVersionFactory(event, context);
});

FastFactoryContract.ContestCloned.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  const nextSummaryEntity = {
    ...currentSummaryEntity,
    contestCloneCount: currentSummaryEntity.contestCloneCount + 1n,
  };

  context.FactoryEventsSummary.set(nextSummaryEntity);
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

FastFactoryContract.ContestBuilt.loader(({ event, context }) => {
  context.FactoryEventsSummary.load(FACTORY_EVENTS_SUMMARY_KEY);
});

FastFactoryContract.ContestBuilt.handler(({ event, context }) => {
  const summary = context.FactoryEventsSummary.get(FACTORY_EVENTS_SUMMARY_KEY);

  const currentSummaryEntity: FactoryEventsSummaryEntity =
    summary ?? FACTORY_EVENTS_SUMMARY;

  const nextSummaryEntity = {
    ...currentSummaryEntity,
    contestCloneCount: currentSummaryEntity.contestBuiltCount + 1n,
  };

  context.FactoryEventsSummary.set(nextSummaryEntity);
  addTransaction(event, context.Transaction.set);
});
