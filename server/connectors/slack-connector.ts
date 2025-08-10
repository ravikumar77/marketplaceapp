
import { WebClient } from '@slack/web-api';

export class SlackConnector {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  async sendMessage(channel: string, text: string, options?: any) {
    try {
      const result = await this.client.chat.postMessage({
        channel,
        text,
        ...options
      });
      return result;
    } catch (error) {
      console.error('Slack send error:', error);
      throw error;
    }
  }

  async getChannels() {
    try {
      const result = await this.client.conversations.list();
      return result.channels;
    } catch (error) {
      console.error('Slack channels error:', error);
      throw error;
    }
  }

  async getUserInfo(userId: string) {
    try {
      const result = await this.client.users.info({ user: userId });
      return result.user;
    } catch (error) {
      console.error('Slack user info error:', error);
      throw error;
    }
  }
}

export const slackConnector = new SlackConnector();
