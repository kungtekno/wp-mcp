#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function loadConfig() {
  // Try to load config from environment variable first
  const configPath = process.env.WORDPRESS_CONFIG || path.join(path.dirname(__dirname), 'wordpress-config.json');
  
  try {
    const config = await fs.readJson(configPath);
    return config.wordpress;
  } catch (error) {
    console.error(`${colors.red}✗ Could not load configuration from: ${configPath}${colors.reset}`);
    console.error(`  Please create a wordpress-config.json file with your WordPress credentials.`);
    console.error(`  See SETUP_GUIDE.md for instructions.`);
    process.exit(1);
  }
}

async function testConnection(config) {
  console.log(`${colors.blue}WordPress MCP Server - Connection Test${colors.reset}\n`);
  console.log(`Testing connection to: ${config.site_url}`);
  console.log(`Username: ${config.username}`);
  console.log(`Password: ${config.app_password.replace(/./g, '*')}\n`);

  const results = {
    authentication: false,
    posts: false,
    media: false,
    categories: false,
    users: false
  };

  const axiosConfig = {
    baseURL: config.site_url,
    auth: {
      username: config.username,
      password: config.app_password.replace(/\s/g, '')
    },
    timeout: config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'WordPress-MCP-Server/1.0'
    }
  };

  // If SSL verification is disabled (not recommended)
  if (config.verify_ssl === false) {
    console.log(`${colors.yellow}⚠ SSL verification is disabled (not recommended for production)${colors.reset}\n`);
    const https = await import('https');
    axiosConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false });
  }

  const client = axios.create(axiosConfig);

  // Test 1: Authentication
  console.log('1. Testing authentication...');
  try {
    const response = await client.get('/wp-json/wp/v2/users/me');
    results.authentication = true;
    console.log(`${colors.green}✓ Authentication successful${colors.reset}`);
    console.log(`  Logged in as: ${response.data.name} (${response.data.slug})`);
    console.log(`  User role: ${response.data.roles ? response.data.roles.join(', ') : 'N/A'}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Authentication failed${colors.reset}`);
    console.log(`  Error: ${error.response?.data?.message || error.message}\n`);
    
    if (error.response?.status === 401) {
      console.log(`  Troubleshooting tips:`);
      console.log(`  - Ensure you're using an Application Password, not your login password`);
      console.log(`  - Check that Application Passwords are enabled in WordPress`);
      console.log(`  - Verify the username is correct`);
    }
    return results;
  }

  // Test 2: Posts endpoint
  console.log('2. Testing posts endpoint...');
  try {
    const response = await client.get('/wp-json/wp/v2/posts?per_page=1');
    results.posts = true;
    console.log(`${colors.green}✓ Can retrieve posts${colors.reset}`);
    console.log(`  Total posts available: ${response.headers['x-wp-total'] || 'Unknown'}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Cannot access posts${colors.reset}`);
    console.log(`  Error: ${error.response?.data?.message || error.message}\n`);
  }

  // Test 3: Media endpoint
  console.log('3. Testing media endpoint...');
  try {
    const response = await client.get('/wp-json/wp/v2/media?per_page=1');
    results.media = true;
    console.log(`${colors.green}✓ Can access media library${colors.reset}`);
    console.log(`  Total media items: ${response.headers['x-wp-total'] || 'Unknown'}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Cannot access media${colors.reset}`);
    console.log(`  Error: ${error.response?.data?.message || error.message}\n`);
  }

  // Test 4: Categories endpoint
  console.log('4. Testing categories endpoint...');
  try {
    const response = await client.get('/wp-json/wp/v2/categories?per_page=1');
    results.categories = true;
    console.log(`${colors.green}✓ Can access categories${colors.reset}`);
    console.log(`  Total categories: ${response.headers['x-wp-total'] || 'Unknown'}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Cannot access categories${colors.reset}`);
    console.log(`  Error: ${error.response?.data?.message || error.message}\n`);
  }

  // Test 5: Users endpoint
  console.log('5. Testing users endpoint...');
  try {
    const response = await client.get('/wp-json/wp/v2/users?per_page=1');
    results.users = true;
    console.log(`${colors.green}✓ Can access users${colors.reset}`);
    console.log(`  Total users: ${response.headers['x-wp-total'] || 'Unknown'}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Cannot access users${colors.reset}`);
    console.log(`  Error: ${error.response?.data?.message || error.message}\n`);
  }

  return results;
}

async function main() {
  try {
    const config = await loadConfig();
    const results = await testConnection(config);
    
    const passed = Object.values(results).filter(v => v).length;
    const total = Object.keys(results).length;
    
    console.log('─'.repeat(50));
    console.log(`\nTest Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log(`${colors.green}✓ All tests passed! Your WordPress MCP server is ready to use.${colors.reset}`);
      process.exit(0);
    } else if (results.authentication) {
      console.log(`${colors.yellow}⚠ Some endpoints are not accessible. Check your user permissions.${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`${colors.red}✗ Authentication failed. Please check your configuration.${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}✗ Unexpected error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();