/**
 * Browser Compatibility Layer
 * Provides a unified API for Chrome and Firefox WebExtensions
 */

export type BrowserType = 'chrome' | 'firefox' | 'unknown';

export interface BrowserRuntime {
  id: string;
  onInstalled: any;
  onStartup: any;
  onSuspend: any;
  onMessage: any;
  onConnect: { addListener: (callback: (port: any) => void) => void };
  sendMessage: (
    message: any,
    responseCallback?: (response: any) => void
  ) => void | Promise<any>;
  getManifest: () => any;
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
  onClicked: any;
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
    callback?: (items: Record<string, any>) => void
  ) => Promise<Record<string, any>> | void;
  set: (
    items: Record<string, any>,
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
    queryInfo: any,
    callback?: (tabs: any[]) => void
  ) => Promise<any[]> | void;
  sendMessage: (
    tabId: number,
    message: any,
    options?: any,
    responseCallback?: (response: any) => void
  ) => void | Promise<any>;
  onUpdated: any;
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
  const globalBrowser = (globalThis as any).browser;
  if (
    typeof globalBrowser !== 'undefined' &&
    globalBrowser.runtime &&
    globalBrowser.runtime.id
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
  // Promisify callback-based storage API
  const promisifyStorageArea = (
    area: chrome.storage.StorageArea
  ): BrowserStorageArea => ({
    get: (
      keys: string | string[] | object | null,
      callback?: (items: Record<string, any>) => void
    ) => {
      if (callback) {
        return area.get(keys, callback);
      }
      return new Promise(resolve => {
        area.get(keys, items => resolve(items));
      });
    },
    set: (items: Record<string, any>, callback?: () => void) => {
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

  // Promisify tabs API
  const promisifyTabs = (): BrowserTabs => ({
    query: (queryInfo: any, callback?: (tabs: any[]) => void) => {
      if (callback) {
        return chrome.tabs.query(queryInfo, callback);
      }
      return new Promise(resolve => {
        chrome.tabs.query(queryInfo, tabs => resolve(tabs));
      });
    },
    sendMessage: (
      tabId: number,
      message: any,
      options?: any,
      responseCallback?: (response: any) => void
    ) => {
      if (responseCallback) {
        return chrome.tabs.sendMessage(
          tabId,
          message,
          options,
          responseCallback
        );
      }
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, options, response => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    },
    onUpdated: chrome.tabs.onUpdated,
  });

  return {
    runtime: chrome.runtime as BrowserRuntime,
    action: chrome.action as BrowserAction,
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

/**
 * Firefox-specific API wrapper
 */
function getFirefoxAPI(): UnifiedBrowserAPI {
  const browserAPI = (globalThis as any).browser;

  // Firefox uses Promise-based storage API
  const promisifyStorageArea = (area: any): BrowserStorageArea => ({
    get: (keys: string | string[] | object | null) => {
      return area.get(keys);
    },
    set: (items: Record<string, any>) => {
      return area.set(items);
    },
    remove: (keys: string | string[]) => {
      return area.remove(keys);
    },
    clear: () => {
      return area.clear();
    },
  });

  // Firefox browserAction is similar to Chrome action
  const actionAPI = browserAPI.browserAction || browserAPI.action;

  return {
    runtime: browserAPI.runtime as BrowserRuntime,
    action: actionAPI as BrowserAction,
    storage: {
      local: promisifyStorageArea(browserAPI.storage.local),
      sync: browserAPI.storage.sync
        ? promisifyStorageArea(browserAPI.storage.sync)
        : undefined,
    },
    tabs: browserAPI.tabs as BrowserTabs,
    sidePanel: undefined,
    alarms: browserAPI.alarms as BrowserAlarms,
    isPopupOnly: true,
    supportsSidePanel: false,
  };
}

/**
 * Get current platform from build configuration
 * Set at build time by webpack DefinePlugin
 */
export function getTargetBrowser(): BrowserType {
  const targetBrowser = (typeof process !== 'undefined' &&
    (process as any).env?.TARGET_BROWSER) as BrowserType | undefined;
  return targetBrowser || detectBrowser();
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
