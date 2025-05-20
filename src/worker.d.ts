declare module '*worker' {
  const WorkerConstructor: {
    new (): Worker;
  };
  export default WorkerConstructor;
}

// Add interface extensions needed for web workers
interface WorkerGlobalScopeEventMap {
  message: MessageEvent;
  messageerror: MessageEvent;
}

interface WorkerGlobalScope {
  importScripts(...urls: string[]): void;
  readonly location: WorkerLocation;
  onerror: ((this: WorkerGlobalScope, ev: ErrorEvent) => any) | null;
  onlanguagechange: ((this: WorkerGlobalScope, ev: Event) => any) | null;
  onoffline: ((this: WorkerGlobalScope, ev: Event) => any) | null;
  ononline: ((this: WorkerGlobalScope, ev: Event) => any) | null;
  onrejectionhandled: ((this: WorkerGlobalScope, ev: PromiseRejectionEvent) => any) | null;
  onunhandledrejection: ((this: WorkerGlobalScope, ev: PromiseRejectionEvent) => any) | null;
  readonly self: WorkerGlobalScope & typeof globalThis;
  readonly navigator: WorkerNavigator;
  readonly performance: Performance;
}

declare var self: WorkerGlobalScope;