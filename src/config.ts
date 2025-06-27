import { readFileSync } from 'fs';
import { WordPressConfig, WordPressConfigSchema } from './types.js';

export class ConfigManager {
  private config: WordPressConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      // Try to load from environment variable first
      const configPath = process.env.WORDPRESS_CONFIG;
      if (configPath) {
        const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
        this.config = WordPressConfigSchema.parse(configData.wordpress || configData);
        return;
      }

      // Try to load from environment variables directly
      const envConfig = {
        site_url: process.env.WORDPRESS_SITE_URL,
        username: process.env.WORDPRESS_USERNAME,
        app_password: process.env.WORDPRESS_APP_PASSWORD,
        verify_ssl: process.env.WORDPRESS_VERIFY_SSL === 'false' ? false : true,
        timeout: process.env.WORDPRESS_TIMEOUT ? parseInt(process.env.WORDPRESS_TIMEOUT) : 30000
      };

      if (envConfig.site_url && envConfig.username && envConfig.app_password) {
        this.config = WordPressConfigSchema.parse(envConfig);
        return;
      }

      // Try to load from default config file
      try {
        const defaultConfigData = JSON.parse(readFileSync('./wordpress-config.json', 'utf-8'));
        this.config = WordPressConfigSchema.parse(defaultConfigData.wordpress || defaultConfigData);
      } catch (error) {
        // Config file doesn't exist or is invalid
        this.config = null;
      }
    } catch (error) {
      console.error('Failed to load WordPress configuration:', error);
      this.config = null;
    }
  }

  getConfig(): WordPressConfig {
    if (!this.config) {
      throw new Error(
        'WordPress configuration not found. Please provide configuration via:\n' +
        '1. Environment variable WORDPRESS_CONFIG pointing to a JSON file\n' +
        '2. Environment variables: WORDPRESS_SITE_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD\n' +
        '3. A wordpress-config.json file in the current directory\n\n' +
        'Example configuration:\n' +
        '{\n' +
        '  "wordpress": {\n' +
        '    "site_url": "https://yoursite.com",\n' +
        '    "username": "your-username",\n' +
        '    "app_password": "xxxx xxxx xxxx xxxx xxxx xxxx",\n' +
        '    "verify_ssl": true,\n' +
        '    "timeout": 30000\n' +
        '  }\n' +
        '}'
      );
    }
    return this.config;
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    if (!this.config) {
      return { valid: false, errors: ['Configuration not loaded'] };
    }

    try {
      WordPressConfigSchema.parse(this.config);
      return { valid: true, errors: [] };
    } catch (error: any) {
      const errors = error.errors?.map((err: any) => `${err.path.join('.')}: ${err.message}`) || [error.message];
      return { valid: false, errors };
    }
  }
}