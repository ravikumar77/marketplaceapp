
import { google } from 'googleapis';

class GoogleSheetsConnector {
  private sheets: any;

  constructor(credentials: any) {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async readRange(spreadsheetId: string, range: string) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });
      return response.data.values;
    } catch (error) {
      console.error('Sheets read error:', error);
      throw error;
    }
  }

  async writeRange(spreadsheetId: string, range: string, values: any[][]) {
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values }
      });
      return response.data;
    } catch (error) {
      console.error('Sheets write error:', error);
      throw error;
    }
  }

  async appendData(spreadsheetId: string, range: string, values: any[][]) {
    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values }
      });
      return response.data;
    } catch (error) {
      console.error('Sheets append error:', error);
      throw error;
    }
  }
}

export const googleSheetsConnector = new GoogleSheetsConnector();
