import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const { createLogger, configure, LOG_LEVELS } = require('../../lib/logger');

describe('Structured Logger', () => {
  let originalStdoutWrite;
  let capturedOutput;

  beforeEach(() => {
    capturedOutput = [];
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = (data) => {
      capturedOutput.push(data);
      return true;
    };
    configure({ level: 'debug', format: 'json' });
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    configure({ level: 'info', format: 'text' });
  });

  it('should create a logger with module context', () => {
    const logger = createLogger('test-module');
    logger.info('hello world');

    expect(capturedOutput.length).toBe(1);
    const entry = JSON.parse(capturedOutput[0]);
    expect(entry.module).toBe('test-module');
    expect(entry.message).toBe('hello world');
    expect(entry.level).toBe('info');
    expect(entry.correlationId).toBeDefined();
    expect(entry.timestamp).toBeDefined();
  });

  it('should include structured data', () => {
    const logger = createLogger('test');
    logger.info('operation complete', { duration: 150, count: 5 });

    const entry = JSON.parse(capturedOutput[0]);
    expect(entry.data.duration).toBe(150);
    expect(entry.data.count).toBe(5);
  });

  it('should respect log level filtering', () => {
    configure({ level: 'warn' });
    const logger = createLogger('test');

    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');

    expect(capturedOutput.length).toBe(1);
    const entry = JSON.parse(capturedOutput[0]);
    expect(entry.level).toBe('warn');
  });

  it('should create child loggers with inherited correlation ID', () => {
    const parent = createLogger('parent', 'abc12345');
    const child = parent.child('child-module');

    parent.info('parent message');
    child.info('child message');

    const parentEntry = JSON.parse(capturedOutput[0]);
    const childEntry = JSON.parse(capturedOutput[1]);

    expect(parentEntry.correlationId).toBe('abc12345');
    expect(childEntry.correlationId).toBe('abc12345');
    expect(childEntry.module).toBe('child-module');
  });

  it('should have all standard log levels', () => {
    expect(LOG_LEVELS).toEqual({
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    });
  });

  it('should not include data field when no data provided', () => {
    const logger = createLogger('test');
    logger.info('simple message');

    const entry = JSON.parse(capturedOutput[0]);
    expect(entry.data).toBeUndefined();
  });
});
