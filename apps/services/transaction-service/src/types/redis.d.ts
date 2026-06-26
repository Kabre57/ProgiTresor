declare module 'redis' {
  export type RedisClientType = {
    isOpen: boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get(key: string): Promise<string | null>;
    setEx(key: string, ttl: number, value: string): Promise<unknown>;
    del(keys: string | string[]): Promise<unknown>;
    scanIterator(options?: { MATCH?: string; COUNT?: number }): AsyncIterable<string>;
    on(event: string, listener: (...args: any[]) => void): RedisClientType;
  };

  export function createClient(options?: { url?: string }): RedisClientType;
}
