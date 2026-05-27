# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # watch mode (Chrome)
npm run dev:firefox      # watch mode (Firefox)
npm run build            # production build (Chrome)
npm run build:all        # production build for both browsers

npm run lint
npm run lint:fix
npm run typecheck
npm run format

npm test                 # run all tests
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report
jest tests/unit/background/services/APIService.test.ts  # run a single test file

npm run release:patch    # bump version, tag, push triggers CI release
```

Build output goes to `dist/chrome/` or `dist/firefox/`. Load the dist folder in `chrome://extensions/` (Developer mode → Load unpacked) to test locally. After changing background code, reload the extension; after changing panel code, close and reopen the side panel.

## Firefox / Zen Browser Support

The extension targets both Chrome and Firefox (including Zen, which is Firefox-based). The build is dual-target; output lands in `dist/chrome/` and `dist/firefox/` respectively.

**Key files:**
- `src/utils/browserCompat.ts` — unified browser API layer. `getBrowserAPI()` uses the build-time `TARGET_BROWSER` constant (set by webpack `DefinePlugin`) via `getTargetBrowser()`. Never call `detectBrowser()` directly — Firefox exposes a `chrome` alias that would fool it.
- `src/config/platformConfig.ts` — build-time feature flags (`PLATFORM_FEATURES.SUPPORTS_SIDE_PANEL`, etc.)
- `src/manifest.firefox.json` — Firefox-specific manifest (uses `sidebar_action` for the panel, `action` for the toolbar button, no `sidePanel` permission)

**Rules when adding new browser API calls:**
- Always go through `getBrowserAPI()` — never call `chrome.*` directly in service/popup code.
- `api.alarms` for the alarms API (not `chrome.alarms` or `api.runtime.alarms`).
- Check `supportsSidePanel()` before any `api.sidePanel.*` call — returns false for Firefox.
- `api.storage.local` handles both Chrome's callback style and Firefox's promise style transparently.

## Architecture

This is a Chrome MV3 / Firefox browser extension with two webpack entry points:

- **`src/background/index.ts`** — the service worker. Instantiates `ServiceManager`, which owns all services and wires message handlers.
- **`src/popup/index.ts`** — the side panel UI. Communicates with the service worker exclusively via `chrome.runtime.sendMessage`.

### ServiceManager

`src/background/ServiceManager.ts` is the composition root. It initialises services in dependency order (Storage → Auth → API → Message → Badge → KeepAlive/ConnectionManager), then registers all message handlers via `MessageService.on()`. When settings change, `RELOAD_SETTINGS` triggers `reinitialize()`, which tears down Auth and API and rebuilds them from the new `DynamicConfig`.

### Config

`src/config/index.ts` holds static compile-time defaults. `src/config/dynamicConfig.ts` merges those with user-saved settings (API host/protocol) from `chrome.storage` at runtime. `DynamicConfig` caches the result; call `DynamicConfig.clearCache()` before `reinitialize()` to force a fresh read.

### Message Protocol

All panel↔background communication uses typed messages defined in `src/background/services/message/IMessageService.ts`. The `MessageType` enum lists canonical message types. Handlers registered with `messageService.on(type, handler)` must return `true` if the response is async, or `false`/`void` if synchronous — this follows the Chrome `sendResponse` keep-alive contract.

### Auth

`MultiProviderAuthService` delegates to individual providers (currently only `PasswordAuthService`). Auth state changes propagate via `onAuthStateChange`, which `ServiceManager` uses to keep `APIService` in sync with the current token.

### Firefox Support

A separate manifest (`src/manifest.firefox.json`) and build target handle Firefox. Webpack selects the correct manifest at build time and injects the version from `package.json` into it.

## Testing

Tests live in `tests/unit/` and mirror the `src/` structure. Chrome APIs are mocked globally in `tests/mocks/chrome.ts` (loaded via `tests/setup.ts`). Mock at the boundary (`chrome.storage`, `chrome.runtime.sendMessage`) rather than implementation internals — see the development guide's note on this pattern.

The `@/` path alias resolves to `src/` in both webpack and Jest (via `moduleNameMapper`).
