import { AsyncLocalStorage } from "node:async_hooks";

/** Selects the scheduler client only for work explicitly run by the scheduler. */
export class WorkloadContext<T extends object> {
  private readonly schedulerContext = new AsyncLocalStorage<T>();

  constructor(
    private readonly requestClient: T,
    private readonly schedulerClient: T,
  ) {}

  get client(): T {
    return this.schedulerContext.getStore() ?? this.requestClient;
  }

  runScheduler<TValue>(work: () => TValue): TValue {
    return this.schedulerContext.run(this.schedulerClient, work);
  }
}

/**
 * Preserve Prisma's public client shape while resolving the actual client at
 * call time. Binding root methods is required for `$queryRaw*` and both
 * `$transaction` overloads, whose implementations read client state via
 * `this`; model delegates retain their own receiver naturally.
 */
export function createContextualClient<T extends object>(context: WorkloadContext<T>): T {
  return new Proxy({} as T, {
    get(_target, key) {
      const client = context.client;
      const value = Reflect.get(client, key);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}
