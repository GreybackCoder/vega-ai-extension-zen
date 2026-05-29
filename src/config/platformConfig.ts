/**
 * Platform-specific configuration
 * Build-time constants set via webpack DefinePlugin
 */

// These will be replaced at build time by webpack DefinePlugin
// Available values: 'chrome' | 'firefox'
declare const process: {
  env: {
    TARGET_BROWSER?: string;
    APP_VERSION?: string;
    NODE_ENV?: string;
  };
};

export const TARGET_BROWSER = (process.env.TARGET_BROWSER || 'chrome') as
  | 'chrome'
  | 'firefox';

/**
 * Feature flags based on target browser
 */
export const PLATFORM_FEATURES = {
  // Chrome supports native side panels
  SUPPORTS_SIDE_PANEL: TARGET_BROWSER === 'chrome',

  // Firefox uses sidebar instead
  SUPPORTS_SIDEBAR: TARGET_BROWSER === 'firefox',

  // Only Chrome has popup-on-click with side panel
  SUPPORTS_POPUP_ON_CLICK: TARGET_BROWSER === 'chrome',

  // Badge display capabilities
  SUPPORTS_BADGE_TEXT: TARGET_BROWSER === 'chrome',
  SUPPORTS_BADGE_COLOR: TARGET_BROWSER === 'chrome',
} as const;

/**
 * Get browser-specific configuration
 */
export const CONFIG = {
  // Which storage areas are available
  storageAreas: {
    local: true,
    sync: TARGET_BROWSER === 'chrome',
  },

  // UI mode
  uiMode: TARGET_BROWSER === 'chrome' ? 'side-panel' : 'sidebar-popup',

  // Maximum storage quota (conservative estimate)
  maxStorageBytes:
    TARGET_BROWSER === 'chrome' ? 10 * 1024 * 1024 : 5 * 1024 * 1024,
} as const;

/**
 * Log platform info for debugging
 */
export function logPlatformInfo(): void {
  console.info('[Platform Config]', {
    targetBrowser: TARGET_BROWSER,
    features: PLATFORM_FEATURES,
    config: CONFIG,
  });
}
