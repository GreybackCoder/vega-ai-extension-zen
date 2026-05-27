import { IBadgeService, BadgeColors } from './IBadgeService';
import { getBrowserAPI, supportsSidePanel } from '@/utils/browserCompat';

export class BadgeService implements IBadgeService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.clear();
    this.isInitialized = true;
  }

  async destroy(): Promise<void> {
    await this.clear();
    this.isInitialized = false;
  }

  async setText(text: string): Promise<void> {
    // Firefox doesn't support badges, so gracefully skip
    if (!supportsSidePanel()) {
      return;
    }

    const api = getBrowserAPI();
    return new Promise((resolve, reject) => {
      try {
        const result = api.action.setBadgeText({ text });

        // Handle promise-based API (Firefox) - though unsupported anyway
        if (result && typeof result.then === 'function') {
          result.then(() => resolve()).catch(reject);
        } else {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async setColor(color: string): Promise<void> {
    // Firefox doesn't support badges, so gracefully skip
    if (!supportsSidePanel()) {
      return;
    }

    const api = getBrowserAPI();
    return new Promise((resolve, reject) => {
      try {
        const result = api.action.setBadgeBackgroundColor({ color });

        // Handle promise-based API (Firefox) - though unsupported anyway
        if (result && typeof result.then === 'function') {
          result.then(() => resolve()).catch(reject);
        } else {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async clear(): Promise<void> {
    await this.setText('');
  }

  async showSuccess(text: string = '✓'): Promise<void> {
    await this.setColor(BadgeColors.SUCCESS);
    await this.setText(text);

    // Auto-clear after 3 seconds
    setTimeout(() => {
      this.clear();
    }, 3000);
  }

  async showError(text: string = '!'): Promise<void> {
    await this.setColor(BadgeColors.ERROR);
    await this.setText(text);

    // Auto-clear after 5 seconds
    setTimeout(() => {
      this.clear();
    }, 5000);
  }
}
