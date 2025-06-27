#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ConfigManager } from './config.js';
import { WordPressClient } from './wordpress-client.js';
import { WordPressTools } from './tools.js';

class WordPressMCPServer {
  private server: Server;
  private configManager: ConfigManager;
  private wordpressClient: WordPressClient | null = null;
  private wordpressTools: WordPressTools | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-wordpress-server',
        version: '1.0.0',
        description: 'MCP server for WordPress integration via REST API'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.configManager = new ConfigManager();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle list tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (!this.ensureInitialized()) {
        return { tools: [] };
      }
      
      return {
        tools: this.wordpressTools!.listTools()
      };
    });

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.ensureInitialized()) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: 'WordPress configuration not found. Please check your configuration.'
          }]
        };
      }

      return await this.wordpressTools!.callTool(request);
    });
  }

  private ensureInitialized(): boolean {
    if (this.wordpressClient && this.wordpressTools) {
      return true;
    }

    try {
      const config = this.configManager.getConfig();
      this.wordpressClient = new WordPressClient(config);
      this.wordpressTools = new WordPressTools(this.wordpressClient);
      return true;
    } catch (error) {
      console.error('Failed to initialize WordPress client:', error);
      return false;
    }
  }

  async start(): Promise<void> {
    // Validate configuration on startup
    if (!this.configManager.isConfigured()) {
      console.error('WordPress configuration not found. Server will start but tools will not be available.');
      console.error('Please provide configuration via environment variables or config file.');
    } else {
      const validation = this.configManager.validateConfig();
      if (!validation.valid) {
        console.error('WordPress configuration is invalid:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        console.error('Server will start but tools will not be available.');
      } else {
        console.log('WordPress configuration loaded successfully.');
        
        // Test connection on startup
        try {
          const config = this.configManager.getConfig();
          const client = new WordPressClient(config);
          const testResult = await client.testConnection();
          console.log('WordPress connection test successful.');
        } catch (error) {
          console.error('Failed to test WordPress connection:', error);
        }
      }
    }

    // Start the server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('MCP WordPress Server started successfully.');
  }
}

// Start the server
const server = new WordPressMCPServer();
server.start().catch((error) => {
  console.error('Failed to start MCP WordPress Server:', error);
  process.exit(1);
});