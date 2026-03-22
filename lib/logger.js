/**
 * Devran AI Kit — Structured Logger
 *
 * Provides structured JSON logging with log levels, correlation IDs,
 * and module context. Replaces raw console.log across all runtime modules.
 *
 * @module lib/logger
 * @author Emre Dursun
 * @since v3.2.0
 */

'use strict';

const crypto = require('crypto');

/** @typedef {'debug' | 'info' | 'warn' | 'error'} LogLevel */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

/** Default minimum log level */
let minLevel = LOG_LEVELS[process.env.AG_LOG_LEVEL] ?? LOG_LEVELS.info;

/** Output mode: 'json' for structured, 'text' for human-readable */
let outputMode = process.env.AG_LOG_FORMAT === 'json' ? 'json' : 'text';

/**
 * Configures the logger.
 *
 * @param {object} options - Logger configuration
 * @param {LogLevel} [options.level] - Minimum log level
 * @param {'json' | 'text'} [options.format] - Output format
 * @returns {void}
 */
function configure(options = {}) {
  if (options.level && LOG_LEVELS[options.level] !== undefined) {
    minLevel = LOG_LEVELS[options.level];
  }
  if (options.format === 'json' || options.format === 'text') {
    outputMode = options.format;
  }
}

/**
 * Generates a short correlation ID for request tracing.
 *
 * @returns {string} 8-character hex correlation ID
 */
function correlationId() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Creates a child logger scoped to a specific module.
 *
 * @param {string} moduleName - Module name for context
 * @param {string} [corrId] - Optional correlation ID (auto-generated if omitted)
 * @returns {{ debug: Function, info: Function, warn: Function, error: Function, child: Function }}
 */
function createLogger(moduleName, corrId) {
  const cid = corrId || correlationId();

  /**
   * Emits a structured log entry.
   *
   * @param {LogLevel} level - Log level
   * @param {string} message - Log message
   * @param {object} [data] - Additional structured data
   * @returns {void}
   */
  function emit(level, message, data) {
    if (LOG_LEVELS[level] < minLevel) {
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      module: moduleName,
      correlationId: cid,
      message,
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
    };

    if (outputMode === 'json') {
      const stream = level === 'error' ? process.stderr : process.stdout;
      stream.write(JSON.stringify(entry) + '\n');
    } else {
      const prefix = `[${entry.timestamp.slice(11, 19)}] [${level.toUpperCase().padEnd(5)}] [${moduleName}]`;
      const suffix = data && Object.keys(data).length > 0
        ? ` ${JSON.stringify(data)}`
        : '';
      const stream = level === 'error' ? console.error : console.log;
      stream(`${prefix} ${message}${suffix}`);
    }
  }

  return {
    debug: (message, data) => emit('debug', message, data),
    info: (message, data) => emit('info', message, data),
    warn: (message, data) => emit('warn', message, data),
    error: (message, data) => emit('error', message, data),

    /**
     * Creates a child logger inheriting the correlation ID.
     *
     * @param {string} childModule - Child module name
     * @returns {ReturnType<typeof createLogger>}
     */
    child: (childModule) => createLogger(childModule, cid),
  };
}

module.exports = {
  createLogger,
  correlationId,
  configure,
  LOG_LEVELS,
};
