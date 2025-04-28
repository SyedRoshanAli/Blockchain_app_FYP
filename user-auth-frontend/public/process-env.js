// This file provides a polyfill for the 'process' global that's missing in the browser environment
window.process = window.process || {};
window.process.env = window.process.env || {};