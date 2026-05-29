/**
 * Browser Compatibility Layer
 * Provides a unified API for Chrome and Firefox WebExtensions
 */

export type BrowserType = 'chrome' | 'firefox' | 'unknown';

export interface BrowserMessageSender {
  tab?: { id?: number; url?: string };
  frameId?: number;
  id?: string;
  url?: string;
  origin?: string;
}

export interface BrowserTab {
  id?: number;
  url?: string;
  active?: boolean;
  windowId?: number;
  index?: number;
  pinned?: boolean;
  highlighted?: boolean;
  incognito?: boolean;
  title?: string;
}

export interface BrowserTabChangeInfo {
  status?: string;
  url?: string;
  pinned?: boolean;
  title?: string;
  favIconUrl?: string;
}

export interface BrowserPort {
  name: string;
  disconnect(): void;
  onDisconnect: {
    addListener: (callback: (port: BrowserPort) => void) => void;
  };
  onMessage: { addListener: (callback: (message: unknown) => void) => void };
  postMessage(message: Record<string, unknown>): void;
  sender?: { tab?: { id?: number }; url?: string };
}

export interface MessageResponse {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface BrowserRuntime {
  id: string;
  onInstalled: {
    addListener: (callback: (details: { reason: string }) => void) => void;
  };
  onStartup: { addListener: (callback: () => void) => void };
  onSuspend: { addListener: (callback: () => void) => void };
  onMessage: {
    addListener(
      callback: (
        message: { type: string },
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
      ) => boolean | void
    ): void;
    removeListener(
      callback: (
        message: { type: string },
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
      ) => boolean | void
    ): void;
  };
  onConnect: { addListener: (callback: (port: BrowserPort) => void) => void };
  sendMessage: (
    message: unknown,
    responseCallback?: (response: MessageResponse) => void
  ) => void | Promise<MessageResponse>;
  getManifest: () => { version: string; [key: string]: unknown };
  lastError?: { message?: string };
}

export interface BrowserAlarms {
  create: (
    name: string,
    alarmInfo: { periodInMinutes?: number; delayInMinutes?: number }
  ) => void | Promise<void>;
  clear: (name: string) => void | Promise<boolean>;
  onAlarm: {
    addListener: (callback: (alarm: { name: string }) => void) => void;
  };
}

export interface BrowserAction {
  onClicked: { addListener: (callback: (tab: BrowserTab) => void) => void };
  setBadgeText: (details: {
    text?: string;
    tabId?: number;
  }) => void | Promise<void>;
  setBadgeBackgroundColor: (details: {
    color: string;
    tabId?: number;
  }) => void | Promise<void>;
  setTitle?: (details: {
    title: string;
    tabId?: number;
  }) => void | Promise<void>;
}

export interface BrowserStorageArea {
  get: (
    keys: string | string[] | object | null,
    callback?: (items: Record<string, unknown>) => void
  ) => Promise<Record<string, unknown>> | void;
  set: (
    items: Record<string, unknown>,
    callback?: () => void
  ) => Promise<void> | void;
  remove: (
    keys: string | string[],
    callback?: () => void
  ) => Promise<void> | void;
  clear: (callback?: () => void) => Promise<void> | void;
}

export interface BrowserStorage {
  local: BrowserStorageArea;
  sync?: BrowserStorageArea;
}

export interface BrowserTabs {
  query: (
    queryInfo: Record<string, unknown>,
    callback?: (tabs: BrowserTab[]) => void
  ) => Promise<BrowserTab[]> | void;
  sendMessage: (
    tabId: number,
    message: unknown,
    options?: Record<string, unknown>,
    responseCallback?: (response: unknown) => void
  ) => void | Promise<unknown>;
  onUpdated: {
    addListener: (
      callback: (
        tabId: number,
        changeInfo: BrowserTabChangeInfo,
        tab: BrowserTab
      ) => void
    ) => void;
  };
}

export interface BrowserSidePanel {
  open?: (options: { tabId?: number }) => Promise<void>;
}

export interface UnifiedBrowserAPI {
  runtime: BrowserRuntime;
  action: BrowserAction;
  storage: BrowserStorage;
  tabs: BrowserTabs;
  sidePanel?: BrowserSidePanel;
  alarms?: BrowserAlarms;
  isPopupOnly: boolean;
  supportsSidePanel: boolean;
}

/**
 * Detect which browser runtime is available
 */
export function detectBrowser(): BrowserType {
  // Check for Chrome API
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    return 'chrome';
  }

  // Check for Firefox API
  const globalBrowser = (globalThis as Record<string, unknown>).browser;
  if (
    globalBrowser !== null &&
    typeof globalBrowser === 'object' &&
    'runtime' in globalBrowser &&
    (globalBrowser as { runtime?: { id?: string } }).runtime?.id
  ) {
    return 'firefox';
  }

  return 'unknown';
}

/**
 * Get unified browser API
 * Handles differences between Chrome and Firefox APIs
 */
export function getBrowserAPI(): UnifiedBrowserAPI {
  const browserType = getTargetBrowser();

  if (browserType === 'chrome') {
    return getChromeAPI();
  } else if (browserType === 'firefox') {
    return getFirefoxAPI();
  }

  throw new Error('Browser API not available');
}

/**
 * Chrome-specific API wrapper
 */
function getChromeAPI(): UnifiedBrowserAPI {
  const promisifyStorageArea = (
    area: chrome.storage.StorageArea
  ): BrowserStorageArea => ({
    get: (
      keys: string | string[] | object | null,
      callback?: (items: Record<string, unknown>) => void
    ) => {
      if (callback) {
        return area.get(
          keys,
          callback as (items: { [key: string]: unknown }) => void
        );
      }
      return new Promise(resolve => {
        area.get(keys, items => resolve(items as Record<string, unknown>));
      });
    },
    set: (items: Record<string, unknown>, callback?: () => void) => {
      if (callback) {
        return area.set(items, callback);
      }
      return new Promise(resolve => {
        area.set(items, resolve);
      });
    },
    remove: (keys: string | string[], callback?: () => void) => {
      if (callback) {
        return area.remove(keys, callback);
      }
      return new Promise(resolve => {
        area.remove(keys, resolve);
      });
    },
    clear: (callback?: () => void) => {
      if (callback) {
        return area.clear(callback);
      }
      return new Promise(resolve => {
        area.clear(resolve);
      });
    },
  });

  const promisifyTabs = (): BrowserTabs => ({
    query: (
      queryInfo: Record<string, unknown>,
      callback?: (tabs: BrowserTab[]) => void
    ) => {
      if (callback) {
        return chrome.tabs.query(
          queryInfo as chrome.tabs.QueryInfo,
          callback as (tabs: chrome.tabs.Tab[]) => void
        );
      }
      return new Promise(resolve => {
        chrome.tabs.query(queryInfo as chrome.tabs.QueryInfo, tabs =>
          resolve(tabs as BrowserTab[])
        );
      });
    },
    sendMessage: (
      tabId: number,
      message: unknown,
      options?: Record<string, unknown>,
      responseCallback?: (response: unknown) => void
    ) => {
      if (responseCallback) {
        return chrome.tabs.sendMessage(
          tabId,
          message,
          options as chrome.tabs.MessageSendOptions,
          responseCallback
        );
      }
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabId,
          message,
          options as chrome.tabs.MessageSendOptions,
          response => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      });
    },
    onUpdated: chrome.tabs.onUpdated as unknown as BrowserTabs['onUpdated'],
  });

  return {
    runtime: chrome.runtime as unknown as BrowserRuntime,
    action: chrome.action as unknown as BrowserAction,
    storage: {
      local: promisifyStorageArea(chrome.storage.local),
      sync: promisifyStorageArea(chrome.storage.sync),
    },
    tabs: promisifyTabs(),
    sidePanel: chrome.sidePanel as BrowserSidePanel,
    alarms: chrome.alarms as unknown as BrowserAlarms,
    isPopupOnly: false,
    supportsSidePanel: true,
  };
}

type FirefoxStorageArea = {
  get(
    keys: string | string[] | object | null
  ): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
};

type FirefoxAPI = {
  runtime: BrowserRuntime;
  storage: { local: FirefoxStorageArea; sync?: FirefoxStorageArea };
  tabs: BrowserTabs;
  alarms: BrowserAlarms;
  browserAction?: BrowserAction;
  action?: BrowserAction;
};

/**
 * Firefox-specific API wrapper
 */
function getFirefoxAPI(): UnifiedBrowserAPI {
  const browserAPI = (globalThis as Record<string, unknown>)
    .browser as FirefoxAPI;

  const promisifyStorageArea = (
    area: FirefoxStorageArea
  ): BrowserStorageArea => ({
    get: (keys: string | string[] | object | null) => area.get(keys),
    set: (items: Record<string, unknown>) => area.set(items),
    remove: (keys: string | string[]) => area.remove(keys),
    clear: () => area.clear(),
  });

  const actionAPI = browserAPI.browserAction ?? browserAPI.action;

  return {
    runtime: browserAPI.runtime,
    action: actionAPI as BrowserAction,
    storage: {
      local: promisifyStorageArea(browserAPI.storage.local),
      sync: browserAPI.storage.sync
        ? promisifyStorageArea(browserAPI.storage.sync)
        : undefined,
    },
    tabs: browserAPI.tabs,
    sidePanel: undefined,
    alarms: browserAPI.alarms,
    isPopupOnly: true,
    supportsSidePanel: false,
  };
}

/**
 * Get current platform from build configuration
 * Set at build time by webpack DefinePlugin
 */
export function getTargetBrowser(): BrowserType {
  if (typeof process !== 'undefined') {
    const env = (process as { env?: { TARGET_BROWSER?: string } }).env;
    const target = env?.TARGET_BROWSER;
    if (target === 'chrome' || target === 'firefox') {
      return target;
    }
  }
  return detectBrowser();
}

/**
 * Check if current environment supports side panels
 */
export function supportsSidePanel(): boolean {
  const api = getBrowserAPI();
  return api.supportsSidePanel && !!api.sidePanel;
}

/**
 * Check if running in popup-only mode (Firefox)
 */
export function isPopupOnly(): boolean {
  const api = getBrowserAPI();
  return api.isPopupOnly;
}
