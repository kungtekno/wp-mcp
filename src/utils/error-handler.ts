import { 
  WordPressAuthError, 
  AuthErrorType,
  ConnectionTestResult 
} from '../types.js';

/**
 * Error context for better error handling
 */
export interface ErrorContext {
  operation: string;
  endpoint?: string;
  httpMethod?: string;
  httpStatus?: number;
  timestamp: Date;
  userAgent?: string;
}

/**
 * Error handling utilities for WordPress authentication and API operations
 */
export class WordPressErrorHandler {
  
  /**
   * Creates a user-friendly error message from a WordPressAuthError
   */
  public static createUserFriendlyMessage(error: WordPressAuthError, context?: ErrorContext): string {
    const baseMessage = this.getBaseErrorMessage(error.type);
    const contextInfo = context ? this.formatContextInfo(context) : '';
    
    switch (error.type) {
      case AuthErrorType.INVALID_CREDENTIALS:
        return `${baseMessage}\n\nPlease check:\n- Your WordPress username is correct\n- Your Application Password is valid and properly formatted\n- The Application Password hasn't been revoked${contextInfo}`;

      case AuthErrorType.UNAUTHORIZED:
        return `${baseMessage}\n\nThis usually means:\n- Your Application Password has expired or been revoked\n- Your user account has been deactivated\n- The WordPress site has changed authentication requirements${contextInfo}`;

      case AuthErrorType.FORBIDDEN:
        return `${baseMessage}\n\nYour account doesn't have sufficient permissions. You may need:\n- Administrator or Editor role\n- Specific capabilities for the requested operation\n- Site owner to grant additional permissions${contextInfo}`;

      case AuthErrorType.TIMEOUT:
        return `${baseMessage}\n\nThis could be due to:\n- Slow internet connection\n- WordPress site performance issues\n- Server overload\n\nTry again in a few moments${contextInfo}`;

      case AuthErrorType.NETWORK_ERROR:
        return `${baseMessage}\n\nPossible causes:\n- WordPress site is down\n- DNS resolution issues\n- Firewall blocking the connection\n- Internet connection problems${contextInfo}`;

      case AuthErrorType.SSL_ERROR:
        return `${baseMessage}\n\nSSL certificate issues detected:\n- Certificate may be expired or invalid\n- Self-signed certificate not trusted\n- SSL configuration problems on the WordPress site\n\nContact your site administrator${contextInfo}`;

      case AuthErrorType.RATE_LIMITED:
        return `${baseMessage}\n\nYou're making requests too quickly. Please:\n- Wait a few moments before trying again\n- Reduce the frequency of your requests\n- Check if your site has rate limiting enabled${contextInfo}`;

      case AuthErrorType.INVALID_URL:
        return `${baseMessage}\n\nPlease verify:\n- Your WordPress site URL is correct\n- The URL uses HTTPS (required for security)\n- The site is accessible from this location${contextInfo}`;

      default:
        return `${baseMessage}${contextInfo}`;
    }
  }

  /**
   * Gets the base error message for an error type
   */
  private static getBaseErrorMessage(errorType: AuthErrorType): string {
    switch (errorType) {
      case AuthErrorType.INVALID_CREDENTIALS:
        return 'Authentication failed - invalid credentials.';
      case AuthErrorType.UNAUTHORIZED:
        return 'Access denied - authentication required.';
      case AuthErrorType.FORBIDDEN:
        return 'Access forbidden - insufficient permissions.';
      case AuthErrorType.TIMEOUT:
        return 'Request timed out.';
      case AuthErrorType.NETWORK_ERROR:
        return 'Network connection failed.';
      case AuthErrorType.SSL_ERROR:
        return 'SSL/TLS connection error.';
      case AuthErrorType.RATE_LIMITED:
        return 'Rate limit exceeded.';
      case AuthErrorType.INVALID_URL:
        return 'Invalid WordPress site URL.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  /**
   * Formats context information for error messages
   */
  private static formatContextInfo(context: ErrorContext): string {
    const parts: string[] = [];
    
    if (context.operation) {
      parts.push(`Operation: ${context.operation}`);
    }
    
    if (context.endpoint) {
      parts.push(`Endpoint: ${context.endpoint}`);
    }
    
    if (context.httpStatus) {
      parts.push(`HTTP Status: ${context.httpStatus}`);
    }
    
    if (parts.length === 0) {
      return '';
    }
    
    return `\n\nTechnical details:\n${parts.join('\n')}`;
  }

  /**
   * Determines if an error is recoverable
   */
  public static isRecoverableError(error: WordPressAuthError): boolean {
    switch (error.type) {
      case AuthErrorType.TIMEOUT:
      case AuthErrorType.NETWORK_ERROR:
      case AuthErrorType.RATE_LIMITED:
        return true;
      
      case AuthErrorType.UNAUTHORIZED:
        // Might be recoverable if authentication can be refreshed
        return true;
      
      case AuthErrorType.INVALID_CREDENTIALS:
      case AuthErrorType.FORBIDDEN:
      case AuthErrorType.INVALID_URL:
      case AuthErrorType.SSL_ERROR:
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Suggests recovery actions for an error
   */
  public static getRecoveryActions(error: WordPressAuthError): string[] {
    const actions: string[] = [];
    
    switch (error.type) {
      case AuthErrorType.INVALID_CREDENTIALS:
        actions.push('Verify your WordPress username');
        actions.push('Check your Application Password');
        actions.push('Ensure the Application Password hasn\'t been revoked');
        actions.push('Try generating a new Application Password');
        break;

      case AuthErrorType.UNAUTHORIZED:
        actions.push('Try refreshing your authentication');
        actions.push('Check if your Application Password is still valid');
        actions.push('Verify your user account is still active');
        break;

      case AuthErrorType.FORBIDDEN:
        actions.push('Contact your site administrator for proper permissions');
        actions.push('Ensure your user has Administrator or Editor role');
        actions.push('Check if specific capabilities are required');
        break;

      case AuthErrorType.TIMEOUT:
        actions.push('Try again in a few moments');
        actions.push('Check your internet connection');
        actions.push('Verify the WordPress site is responding');
        break;

      case AuthErrorType.NETWORK_ERROR:
        actions.push('Check your internet connection');
        actions.push('Verify the WordPress site URL is correct');
        actions.push('Ensure the site is accessible from your location');
        break;

      case AuthErrorType.SSL_ERROR:
        actions.push('Contact your site administrator about SSL certificate issues');
        actions.push('Verify the SSL certificate is valid and not expired');
        actions.push('Check if the site uses a self-signed certificate');
        break;

      case AuthErrorType.RATE_LIMITED:
        actions.push('Wait before making additional requests');
        actions.push('Reduce request frequency');
        actions.push('Check site rate limiting configuration');
        break;

      case AuthErrorType.INVALID_URL:
        actions.push('Verify the WordPress site URL is correct');
        actions.push('Ensure the URL uses HTTPS');
        actions.push('Check that the site is accessible');
        break;
    }
    
    return actions;
  }

  /**
   * Creates a structured error response for MCP
   */
  public static createMCPErrorResponse(error: WordPressAuthError, context?: ErrorContext): {
    isError: true;
    content: Array<{ type: 'text'; text: string }>;
  } {
    const friendlyMessage = this.createUserFriendlyMessage(error, context);
    const recoveryActions = this.getRecoveryActions(error);
    
    let fullMessage = friendlyMessage;
    
    if (recoveryActions.length > 0) {
      fullMessage += '\n\nSuggested actions:\n' + recoveryActions.map(action => `• ${action}`).join('\n');
    }
    
    return {
      isError: true,
      content: [{
        type: 'text',
        text: fullMessage
      }]
    };
  }

  /**
   * Logs error with appropriate level and context
   */
  public static logError(error: WordPressAuthError, context?: ErrorContext): void {
    const logData = {
      error_type: error.type,
      message: error.message,
      http_status: error.httpStatus,
      timestamp: new Date().toISOString(),
      context: context || {}
    };
    
    // Determine log level based on error type
    const logLevel = this.getLogLevel(error.type);
    
    switch (logLevel) {
      case 'error':
        console.error('WordPress Auth Error:', logData);
        break;
      case 'warn':
        console.warn('WordPress Auth Warning:', logData);
        break;
      case 'info':
        console.info('WordPress Auth Info:', logData);
        break;
      default:
        console.log('WordPress Auth:', logData);
    }
  }

  /**
   * Gets appropriate log level for error type
   */
  private static getLogLevel(errorType: AuthErrorType): 'error' | 'warn' | 'info' | 'debug' {
    switch (errorType) {
      case AuthErrorType.INVALID_CREDENTIALS:
      case AuthErrorType.FORBIDDEN:
      case AuthErrorType.SSL_ERROR:
        return 'error';
      
      case AuthErrorType.UNAUTHORIZED:
      case AuthErrorType.INVALID_URL:
        return 'warn';
      
      case AuthErrorType.TIMEOUT:
      case AuthErrorType.NETWORK_ERROR:
      case AuthErrorType.RATE_LIMITED:
        return 'info';
      
      default:
        return 'debug';
    }
  }

  /**
   * Creates a troubleshooting guide for connection issues
   */
  public static createTroubleshootingGuide(testResult: ConnectionTestResult): string {
    if (testResult.success) {
      return 'Connection successful! No troubleshooting needed.';
    }
    
    const guide = ['WordPress Connection Troubleshooting Guide', ''];
    
    if (testResult.error) {
      guide.push(`Error: ${testResult.error.message}`);
      guide.push('');
      
      // Add specific troubleshooting based on error code
      switch (testResult.error.code) {
        case 'ENOTFOUND':
        case 'ECONNREFUSED':
          guide.push('DNS/Connection Issues:');
          guide.push('• Verify the WordPress site URL is correct');
          guide.push('• Check if the site is accessible in a web browser');
          guide.push('• Ensure your internet connection is working');
          guide.push('• Try accessing the site from a different network');
          break;
          
        case 'ETIMEDOUT':
          guide.push('Timeout Issues:');
          guide.push('• The WordPress site may be slow or overloaded');
          guide.push('• Try increasing the timeout setting');
          guide.push('• Check if the site responds normally in a browser');
          guide.push('• Contact the site administrator if issues persist');
          break;
          
        case 'CERT_HAS_EXPIRED':
        case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
          guide.push('SSL Certificate Issues:');
          guide.push('• The site\'s SSL certificate has problems');
          guide.push('• Contact the site administrator to fix the certificate');
          guide.push('• Verify the certificate in a web browser');
          guide.push('• Do not disable SSL verification unless absolutely necessary');
          break;
          
        default:
          guide.push('General Troubleshooting:');
          guide.push('• Check your WordPress site configuration');
          guide.push('• Verify your authentication credentials');
          guide.push('• Ensure the WordPress REST API is enabled');
          guide.push('• Contact technical support if issues persist');
      }
    }
    
    guide.push('');
    guide.push('Common Solutions:');
    guide.push('• Regenerate your WordPress Application Password');
    guide.push('• Check if your WordPress user has sufficient permissions');
    guide.push('• Verify the WordPress site supports REST API');
    guide.push('• Ensure the site URL uses HTTPS');
    
    return guide.join('\n');
  }
}