import { IStorageService, StorageArea } from './IStorageService';
import { Logger } from '@/utils/logger';
import { getBrowserAPI } from '@/utils/browserCompat';

export class StorageService implements IStorageService {
  private area: any;
  private isInitialized = false;
  private logger = new Logger('StorageService');

  constructor(area: StorageArea = 'local') {
    const api = getBrowserAPI();
    this.area = (api.storage as Record<string, any>)[area];
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  async destroy(): Promise<void> {
    this.isInitialized = false;
  }

  async get<T>(key: string): Promise<T | null> {
    return new Promise(resolve => {
      try {
        const result = this.area.get(key, (items: Record<string, any>) => {
          const value = items[key] !== undefined ? items[key] : null;
          resolve(value as T | null);
        });

        // Handle promise-based API (Firefox)
        if (result && typeof result.then === 'function') {
          result
            .then((items: Record<string, any>) => {
              const value = items[key] !== undefined ? items[key] : null;
              resolve(value as T | null);
            })
            .catch(() => resolve(null));
        }
      } catch (error) {
        this.logger.error('Storage get error', error);
        resolve(null);
      }
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const result = this.area.set({ [key]: value }, () => {
          resolve();
        });

        // Handle promise-based API (Firefox)
        if (result && typeof result.then === 'function') {
          result.then(() => resolve()).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const result = this.area.remove(key, () => {
          resolve();
        });

        // Handle promise-based API (Firefox)
        if (result && typeof result.then === 'function') {
          result.then(() => resolve()).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const result = this.area.clear(() => {
          resolve();
        });

        // Handle promise-based API (Firefox)
        if (result && typeof result.then === 'function') {
          result.then(() => resolve()).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async getMultiple<T extends Record<string, unknown>>(
    keys: string[]
  ): Promise<Partial<T>> {
    return new Promise(resolve => {
      try {
        const result = this.area.get(keys, (items: Record<string, any>) => {
          resolve(items as Partial<T>);
        });

        // Handle promise-based API (Firefox)
        if (result && typeof result.then === 'function') {
          result
            .then((items: Record<string, any>) => {
              resolve(items as Partial<T>);
            })
            .catch(() => resolve({} as Partial<T>));
        }
      } catch (error) {
        this.logger.error('Storage getMultiple error', error);
        resolve({} as Partial<T>);
      }
    });
  }

  async setMultiple(items: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const result = this.area.set(items, () => {
          resolve();
        });

        // Handle promise-based API (Firefox)
        if (result && typeof result.then === 'function') {
          result.then(() => resolve()).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}
