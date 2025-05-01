// Import process polyfill first to ensure it's available globally
import './processPolyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App';

// Make sure process is defined globally
if (typeof window !== 'undefined') {
  window.process = window.process || {
    env: {
      NODE_ENV: 'production',
      REACT_APP_ENV: 'browser'
    },
    browser: true,
    version: '',
    versions: {},
    nextTick: function(cb) { setTimeout(cb, 0); }
  };
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
