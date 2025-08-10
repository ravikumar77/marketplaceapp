
import TelegramBot from 'node-telegram-bot-api';

export class TelegramConnector {
  private bot: TelegramBot;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: false });
  }

  async sendMessage(chatId: string, text: string, options?: any) {
    try {
      const result = await this.bot.sendMessage(chatId, text, options);
      return result;
    } catch (error) {
      console.error('Telegram send error:', error);
      throw error;
    }
  }

  async getMe() {
    try {
      const result = await this.bot.getMe();
      return result;
    } catch (error) {
      console.error('Telegram getMe error:', error);
      throw error;
    }
  }

  async setWebhook(url: string) {
    try {
      const result = await this.bot.setWebHook(url);
      return result;
    } catch (error) {
      console.error('Telegram webhook error:', error);
      throw error;
    }
  }
}

export const telegramConnector = new TelegramConnector();
