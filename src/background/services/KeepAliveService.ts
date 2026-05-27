import { Logger } from '@/utils/logger';
import { getBrowserAPI } from '@/utils/browserCompat';

/**
 * Service to keep the extension's service worker active
 * Uses browser alarms API to periodically wake up the service worker
 */
export class KeepAliveService {
  private static instance: KeepAliveService;
  private logger = new Logger('KeepAliveService');
  private readonly ALARM_NAME = 'keep-alive';
  private readonly ALARM_INTERVAL_MINUTES = 0.5; // 30 seconds

  private constructor() {}

  static getInstance(): KeepAliveService {
    if (!KeepAliveService.instance) {
      KeepAliveService.instance = new KeepAliveService();
    }
    return KeepAliveService.instance;
  }

  async initialize(): Promise<void> {
    const api = getBrowserAPI();

    // Clear any existing alarms first
    try {
      await api.alarms?.clear(this.ALARM_NAME);
    } catch {
      // Alarms might not exist, ignore
    }

    // Create keep-alive alarm
    try {
      await api.alarms?.create(this.ALARM_NAME, {
        periodInMinutes: this.ALARM_INTERVAL_MINUTES,
        delayInMinutes: 0,
      });

      api.alarms?.onAlarm.addListener((alarm) => {
        if (alarm.name === this.ALARM_NAME) {
          this.handleKeepAlive();
        }
      });
    } catch (error) {
      this.logger.error('Failed to initialize keep-alive alarms', error);
    }

    this.logger.info('Keep-alive service initialized');
  }

  private handleKeepAlive(): void {
    // Simple ping to keep service worker active
    this.logger.debug('Keep-alive ping');

    // Perform a simple storage operation to ensure activity
    const api = getBrowserAPI();
    api.storage.local.get(['lastPing'], (result: Record<string, any>) => {
      api.storage.local.set({ lastPing: Date.now() });
    });
  }

  async destroy(): Promise<void> {
    try {
      const api = getBrowserAPI();
      await api.alarms?.clear(this.ALARM_NAME);
    } catch {
      // Ignore errors during cleanup
    }
    this.logger.info('Keep-alive service destroyed');
  }
}

export const keepAliveService = KeepAliveService.getInstance();
