# Using WordPress MCP Server with Claude Code

This guide explains how to use the WordPress MCP Server with Claude Code (not Claude Desktop).

## Quick Start with npx (Recommended)

The easiest way to use this MCP server with Claude Code is through npx:

```bash
# In your project directory where you want to manage WordPress content
npx wp-mcp
```

This will:
1. Download and run the latest version
2. Look for `wordpress-config.json` in your current directory
3. Start the MCP server for Claude Code to connect to

## Local Installation

If you prefer to install it locally:

```bash
# Clone the repository
git clone https://github.com/yourusername/wp-mcp.git
cd wp-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Create your configuration
cp wordpress-config.example.json wordpress-config.json
# Edit wordpress-config.json with your WordPress credentials

# Run the server
npm start
```

## Configuration

1. **Create Application Password in WordPress**:
   - Log into WordPress admin
   - Go to Users → Your Profile
   - Find "Application Passwords" section
   - Generate new password for "Claude Code"
   - Copy the password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)

2. **Configure the MCP Server**:
   Create `wordpress-config.json` in your project:
   ```json
   {
     "wordpress": {
       "site_url": "https://your-site.com",
       "username": "your-username",
       "app_password": "xxxx xxxx xxxx xxxx xxxx xxxx",
       "verify_ssl": true
     }
   }
   ```

## Using in Claude Code

Once the server is running, you can use these commands in Claude Code:

### List Posts
```
List my recent WordPress posts
```

### Read a Post
```
Read the WordPress post with ID 123
```
or
```
Read the WordPress post with slug "my-post-title"
```

### Create a Post
```
Create a new WordPress post titled "My New Post" with the content "This is my post content"
```

### Update a Post
```
Update WordPress post 123 to change the title to "Updated Title"
```

### Upload Media
```
Upload image.jpg to WordPress media library with alt text "Product screenshot"
```

### Search Posts
```
Search WordPress posts for "tutorial" in the category "guides"
```

### Delete a Post
```
Move WordPress post 123 to trash
```

## Available MCP Tools

The following tools are available in Claude Code:

- `wordpress_create_post` - Create new posts/pages
- `wordpress_read_post` - Read post by ID or slug  
- `wordpress_update_post` - Update existing posts
- `wordpress_list_posts` - List and search posts
- `wordpress_delete_post` - Delete posts
- `wordpress_upload_media` - Upload files to media library
- `wordpress_get_media` - Browse media library

## Environment Variables

Instead of a config file, you can use environment variables:

```bash
export WORDPRESS_SITE_URL="https://your-site.com"
export WORDPRESS_USERNAME="your-username"
export WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"

npx wp-mcp
```

## Troubleshooting

### Connection Issues

Test your connection:
```bash
npm run test:connection
```

This will verify:
- Authentication is working
- WordPress REST API is accessible
- Required permissions are granted

### Common Problems

1. **"Authentication failed"**
   - Verify you're using Application Password, not login password
   - Check username is correct
   - Ensure Application Passwords are enabled

2. **"ECONNREFUSED"**
   - Check site URL is correct and uses HTTPS
   - Verify site is accessible from your network
   - Check for firewall/proxy issues

3. **"403 Forbidden"**  
   - Ensure user has Editor or Administrator role
   - Check if security plugins block REST API
   - Verify Application Passwords are enabled

4. **SSL Certificate Issues**
   - For development only, set `"verify_ssl": false` in config
   - For production, ensure valid SSL certificate

### Debug Mode

Enable debug logging:
```bash
DEBUG=wp-mcp:* npx wp-mcp
```

## Examples

### Content Creation Workflow
```
1. Create a draft post about "WordPress Security Best Practices"
2. Upload security-diagram.png and attach it to the post
3. Update the post to include the image and publish it
4. List all posts in the "Security" category
```

### Bulk Operations
```
1. List all draft posts
2. Update each draft to add a "needs-review" tag
3. Get media items uploaded in the last week
```

## Security Notes

- Always use HTTPS in production
- Never commit `wordpress-config.json` to version control
- Use Application Passwords instead of main account password
- Regularly rotate Application Passwords
- Monitor WordPress activity logs

## Getting Help

- Check the [README](README.md) for general information
- Run `npm run test:connection` for diagnostics
- Enable debug mode for detailed logs
- Report issues on [GitHub](https://github.com/yourusername/wp-mcp/issues)