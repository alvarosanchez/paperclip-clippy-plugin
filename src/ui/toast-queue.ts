export type ToastQueueEntry<T> = {
  id: string;
  value: T;
  enqueuedAt: number;
};

export type ToastQueueOptions = {
  now?: () => number;
  idFactory?: () => string;
};

export class ToastQueue<T> {
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private current: ToastQueueEntry<T> | null = null;
  private queue: ToastQueueEntry<T>[] = [];

  constructor(options?: ToastQueueOptions) {
    this.now = options?.now ?? Date.now;
    this.idFactory = options?.idFactory ?? createIdFactory();
  }

  enqueue(value: T): ToastQueueEntry<T> {
    const entry = { id: this.idFactory(), value, enqueuedAt: this.now() };
    if (this.current) {
      this.queue.push(entry);
    } else {
      this.current = entry;
    }
    return entry;
  }

  dequeue(): ToastQueueEntry<T> | null {
    const entry = this.current;
    this.current = this.queue.shift() ?? null;
    return entry;
  }

  peek(): ToastQueueEntry<T> | null {
    return this.current;
  }

  clear(): void {
    this.current = null;
    this.queue = [];
  }

  get size(): number {
    return this.queue.length + (this.current ? 1 : 0);
  }

  get active(): ToastQueueEntry<T> | null {
    return this.current;
  }

  get pending(): ToastQueueEntry<T>[] {
    return [...this.queue];
  }
}

function createIdFactory(): () => string {
  let counter = 0;
  return () => `toast-${++counter}`;
}
