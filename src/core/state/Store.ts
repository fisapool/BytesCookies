export interface State {
  cookies: chrome.cookies.Cookie[];
  loading: boolean;
  error: Error | null;
  lastOperation: {
    type: 'import' | 'export' | null;
    timestamp: number;
    success: boolean;
  };
}

export type Subscriber = (state: State) => void;

export class Store {
  private static instance: Store;
  private state: State;
  private subscribers: Set<Subscriber> = new Set();

  private constructor() {
    this.state = {
      cookies: [],
      loading: false,
      error: null,
      lastOperation: {
        type: null,
        timestamp: 0,
        success: false
      }
    };
  }

  static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  getState(): State {
    return { ...this.state };
  }

  setState(partial: Partial<State>): void {
    this.state = { ...this.state, ...partial };
    this.notifySubscribers();
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(subscriber => subscriber(this.state));
  }
} 