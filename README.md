# WordPress MCP Server

[![npm version](https://img.shields.io/npm/v/wordpress-mcp-server.svg)](https://www.npmjs.com/package/wordpress-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/wordpress-mcp-server.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/yourusername/wordpress-mcp-server/blob/main/CONTRIBUTING.md)

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with WordPress sites through a standardized interface.

## Description

WordPress MCP Server provides a secure bridge between AI assistants and WordPress installations, allowing for content management, site administration, and plugin/theme operations through natural language interactions. Built on the Model Context Protocol standard, it offers a comprehensive set of tools for WordPress automation.

## Features

- **Content Management**: Create, read, update, and delete posts, pages, and custom post types
- **Media Handling**: Upload and manage media files with automatic optimization
- **User Management**: Handle user operations and permissions
- **Plugin & Theme Control**: Install, activate, deactivate, and manage plugins/themes
- **Site Configuration**: Manage WordPress settings and configurations
- **Custom Post Types**: Full support for custom post types and taxonomies
- **SEO Integration**: Built-in support for popular SEO plugins
- **Security**: OAuth2 authentication and secure API communications
- **Batch Operations**: Efficient bulk actions for content and media
- **Real-time Updates**: Live site status and health monitoring

## Prerequisites

- Node.js 16.0 or higher
- npm or yarn package manager
- WordPress 5.0 or higher with REST API enabled
- Valid WordPress admin credentials or application passwords
- Claude Code or any MCP-compatible client

## Installation

### Quick Start with npx (Recommended)

```bash
npx wordpress-mcp-server init
```

### Local Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wordpress-mcp-server.git
cd wordpress-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Configure your WordPress connection
npm run configure
```

### Global Installation

```bash
npm install -g wordpress-mcp-server
wordpress-mcp configure
```

## Configuration

### Initial Setup

1. Create a configuration file:

```bash
npx wordpress-mcp-server configure
```

2. Or manually create `wordpress-config.json`:

```json
{
  "sites": [
    {
      "name": "my-wordpress-site",
      "url": "https://example.com",
      "username": "admin",
      "password": "your-application-password",
      "authMethod": "basic"
    }
  ],
  "defaultSite": "my-wordpress-site"
}
```

### Authentication Methods

#### Application Passwords (Recommended)
1. Go to WordPress Admin → Users → Your Profile
2. Scroll to "Application Passwords"
3. Enter a name and click "Add New Application Password"
4. Copy the generated password to your config

#### Basic Authentication
- Requires HTTP Basic Auth plugin
- Less secure, use only for development

#### OAuth2
- Most secure option
- Requires OAuth2 plugin setup
- See [OAuth2 Setup Guide](docs/oauth2-setup.md)

## Usage Examples

### With Claude Code

1. Add to Claude Code configuration:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": ["wordpress-mcp-server", "start"]
    }
  }
}
```

2. Use natural language commands:

```
"Create a new blog post about AI trends with featured image"
"Update the homepage content"
"Install and activate Yoast SEO plugin"
"Bulk upload images from folder"
```

### Programmatic Usage

```javascript
const { WordPressMCP } = require('wordpress-mcp-server');

const mcp = new WordPressMCP({
  site: 'my-wordpress-site'
});

// Create a post
await mcp.tools.createPost({
  title: 'Hello World',
  content: 'This is my first post!',
  status: 'publish'
});
```

## Available MCP Tools

### Content Tools
- `wp_create_post` - Create posts, pages, or custom post types
- `wp_update_post` - Update existing content
- `wp_get_post` - Retrieve post details
- `wp_delete_post` - Delete content
- `wp_list_posts` - List and filter content

### Media Tools
- `wp_upload_media` - Upload images, videos, documents
- `wp_get_media` - Retrieve media information
- `wp_delete_media` - Remove media files
- `wp_optimize_images` - Bulk image optimization

### Site Management
- `wp_get_site_info` - Site details and health
- `wp_update_settings` - Modify site settings
- `wp_clear_cache` - Clear various caches
- `wp_backup_site` - Create site backups

### Plugin & Theme Tools
- `wp_install_plugin` - Install from repository
- `wp_activate_plugin` - Activate installed plugins
- `wp_update_plugin` - Update to latest version
- `wp_list_themes` - Available themes

### User Management
- `wp_create_user` - Add new users
- `wp_update_user` - Modify user details
- `wp_list_users` - Get user listings
- `wp_manage_roles` - Role and capability management

## Troubleshooting

### Common Issues

#### Connection Failed
- Verify WordPress URL is correct
- Check REST API is enabled: `https://yoursite.com/wp-json/`
- Ensure credentials are valid

#### Authentication Errors
- Application passwords require WordPress 5.6+
- Username should be your login name, not email
- Some hosts block REST API authentication

#### Permission Denied
- User needs appropriate WordPress capabilities
- Check plugin/theme installation permissions
- Verify file upload limits

### Debug Mode

Enable verbose logging:

```bash
export WP_MCP_DEBUG=true
npx wordpress-mcp-server start
```

### Getting Help

- Check [Claude Code Setup Guide](CLAUDE_CODE_SETUP.md)
- Visit [Issues](https://github.com/yourusername/wordpress-mcp-server/issues)
- Join our [Discord Community](https://discord.gg/wordpress-mcp)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## Security

For security concerns, please review our [Security Policy](SECURITY.md) and report issues responsibly.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io) standard
- WordPress REST API documentation and community
- Claude and Anthropic for MCP development

---

Made with ❤️ for the WordPress and AI communities