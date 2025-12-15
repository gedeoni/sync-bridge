import { PubSub as GSPubSub } from 'graphql-subscriptions';

// Adapter to match TypeGraphQL v2 PubSub interface
class TGPubSubAdapter {
  private inner: GSPubSub;
  constructor(inner?: GSPubSub) {
    this.inner = inner ?? new GSPubSub();
  }
  // type-graphql expects void; underlying returns Promise, ignore
  publish(routingKey: string, ...args: unknown[]): void {
    // publish payload as first argument
    void this.inner.publish(routingKey, args[0] as any);
  }
  // return an AsyncIterable for the topic
  subscribe(routingKey: string, _dynamicId?: unknown): AsyncIterable<unknown> {
    const it = this.inner.asyncIterator(routingKey as any) as AsyncIterator<unknown>;
    const asyncIterable: AsyncIterable<unknown> & AsyncIterator<unknown> = {
      next(...args: [] | [undefined]) {
        return it.next(...args);
      },
      return(value?: unknown) {
        return typeof it.return === 'function'
          ? it.return(value)
          : Promise.resolve({ value: undefined, done: true } as any);
      },
      throw(err?: unknown) {
        return typeof it.throw === 'function' ? it.throw(err) : Promise.reject(err);
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    return asyncIterable;
  }
}

export const pubSub = new TGPubSubAdapter();
