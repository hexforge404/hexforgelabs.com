import React from 'react';
import PropTypes from 'prop-types';

const AuthError = ({ error, onRetry }) => (
  <div className="auth-error-container">
    <h2>Authentication Required</h2>
    <div className="error-details">
      <p>We couldn't verify your session:</p>
      <code>{error}</code>
    </div>
    
    <div className="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ol>
        <li>Ensure cookies are enabled in your browser</li>
        <li>Check your network connection</li>
        <li>Try clearing site data and refreshing</li>
      </ol>
    </div>
    
    <div className="auth-actions">
      <button onClick={onRetry} className="auth-retry-button">
        Retry Authentication
      </button>
      <a href="/admin-login" className="auth-login-link">
        Go to Login Page
      </a>
    </div>
  </div>
);

AuthError.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired
};

export default AuthError;

