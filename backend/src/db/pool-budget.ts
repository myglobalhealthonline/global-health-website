export type DbPoolBudget = {
  total: number;
  request: number;
  scheduler: number;
};

/**
 * Split the pre-existing workload connection budget between foreground work
 * and the in-process scheduler. An explicit scheduler value is rejected when
 * it would leave no request capacity; the default simply disables isolation
 * for a one-connection deployment.
 */
export function resolveDbPoolBudget(input: {
  dbPoolMax?: number;
  clusterWorkers: number;
  schedulerDbPoolMax?: number;
}): DbPoolBudget {
  const total = input.dbPoolMax ?? Math.max(2, Math.floor(10 / input.clusterWorkers));
  const requested = input.schedulerDbPoolMax ?? Math.min(2, Math.max(0, total - 1));

  if (requested >= total) {
    throw new Error(
      `SCHEDULER_DB_POOL_MAX (${requested}) must be smaller than DB_POOL_MAX (${total}) so requests retain a database connection`,
    );
  }

  return { total, request: total - requested, scheduler: requested };
}
