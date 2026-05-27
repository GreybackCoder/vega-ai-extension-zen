import {
  IMessageService,
  MessageHandler,
  ExtensionMessage,
} from './IMessageService';
import { Logger } from '@/utils/logger';
import { getBrowserAPI } from '@/utils/browserCompat';

export class MessageService implements IMessageService {
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private isInitialized = false;
  private logger = new Logger('MessageService');
  private messageListener:
    | ((
        message: ExtensionMessage,
        sender: any,
        sendResponse: (response?: unknown) => void
      ) => boolean)
    | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const api = getBrowserAPI();

    this.messageListener = (
      message: ExtensionMessage,
      sender: any,
      sendResponse: (response?: unknown) => void
    ) => {
      const handlers = this.handlers.get(message.type);
      if (!handlers || handlers.size === 0) {
        return false;
      }

      let isAsync = false;

      handlers.forEach(handler => {
        try {
          const result = handler(message, sender, sendResponse);
          if (result === true) {
            isAsync = true;
          }
        } catch (error) {
          this.logger.error(
            `Error in message handler for ${message.type}`,
            error
          );
          sendResponse({
            error: error instanceof Error ? error.message : 'Handler error',
          });
        }
      });

      return isAsync;
    };

    api.runtime.onMessage.addListener(this.messageListener);

    this.isInitialized = true;
  }

  async destroy(): Promise<void> {
    if (this.messageListener) {
      const api = getBrowserAPI();
      api.runtime.onMessage.removeListener(this.messageListener);
    }
    this.handlers.clear();
    this.isInitialized = false;
  }

  on(type: string, handler: MessageHandler): void {
    this.handlers.delete(type);
    this.handlers.set(type, new Set([handler]));
  }

  off(type: string, handler?: MessageHandler): void {
    if (!handler) {
      this.handlers.delete(type);
    } else {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(type);
        }
      }
    }
  }

  clearAllHandlers(): void {
    this.handlers.clear();
  }

  async sendToTab(tabId: number, message: ExtensionMessage): Promise<unknown> {
    const api = getBrowserAPI();
    return new Promise((resolve, reject) => {
      api.tabs.sendMessage(tabId, message, {}, (response) => {
        try {
          // Check for errors (Chrome-style)
          const errorCheck = (api.runtime as any).lastError;
          if (errorCheck) {
            reject(new Error(errorCheck.message));
          } else {
            resolve(response);
          }
        } catch {
          // Firefox uses Promise-based API
          resolve(response);
        }
      });
    });
  }
}
