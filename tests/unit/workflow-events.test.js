import { describe, it, expect, beforeEach } from 'vitest';
const workflowEvents = require('../../lib/workflow-events');

describe('Workflow Event Emitter', () => {
  beforeEach(() => {
    workflowEvents.removeAllListeners();
  });

  it('should emit transition start events', () => {
    let received = null;
    workflowEvents.on(workflowEvents.EVENTS.TRANSITION_START, (event) => {
      received = event;
    });

    workflowEvents.emitTransitionStart('IDLE', 'EXPLORE', 'user command');

    expect(received).not.toBeNull();
    expect(received.type).toBe(workflowEvents.EVENTS.TRANSITION_START);
    expect(received.fromPhase).toBe('IDLE');
    expect(received.toPhase).toBe('EXPLORE');
    expect(received.trigger).toBe('user command');
    expect(received.timestamp).toBeDefined();
  });

  it('should emit transition complete events', () => {
    let received = null;
    workflowEvents.on(workflowEvents.EVENTS.TRANSITION_COMPLETE, (event) => {
      received = event;
    });

    workflowEvents.emitTransitionComplete('IDLE', 'PLAN', '/plan command');

    expect(received).not.toBeNull();
    expect(received.fromPhase).toBe('IDLE');
    expect(received.toPhase).toBe('PLAN');
  });

  it('should emit phase entered events on transition complete', () => {
    let received = null;
    workflowEvents.on(workflowEvents.EVENTS.PHASE_ENTERED, (event) => {
      received = event;
    });

    workflowEvents.emitTransitionComplete('PLAN', 'IMPLEMENT', 'approved');

    expect(received).not.toBeNull();
    expect(received.phase).toBe('IMPLEMENT');
  });

  it('should emit transition failed events', () => {
    let received = null;
    workflowEvents.on(workflowEvents.EVENTS.TRANSITION_FAILED, (event) => {
      received = event;
    });

    workflowEvents.emitTransitionFailed('IDLE', 'DEPLOY', 'Invalid transition');

    expect(received).not.toBeNull();
    expect(received.error).toBe('Invalid transition');
  });

  it('should emit workflow reset events', () => {
    let received = null;
    workflowEvents.on(workflowEvents.EVENTS.WORKFLOW_RESET, (event) => {
      received = event;
    });

    workflowEvents.emitWorkflowReset('IMPLEMENT');

    expect(received).not.toBeNull();
    expect(received.fromPhase).toBe('IMPLEMENT');
    expect(received.toPhase).toBe('IDLE');
  });

  it('should support once listeners', () => {
    let count = 0;
    workflowEvents.once(workflowEvents.EVENTS.TRANSITION_START, () => {
      count++;
    });

    workflowEvents.emitTransitionStart('A', 'B', 'test');
    workflowEvents.emitTransitionStart('B', 'C', 'test');

    expect(count).toBe(1);
  });

  it('should support removing listeners', () => {
    let count = 0;
    const handler = () => { count++; };

    workflowEvents.on(workflowEvents.EVENTS.TRANSITION_START, handler);
    workflowEvents.emitTransitionStart('A', 'B', 'test');
    expect(count).toBe(1);

    workflowEvents.off(workflowEvents.EVENTS.TRANSITION_START, handler);
    workflowEvents.emitTransitionStart('B', 'C', 'test');
    expect(count).toBe(1);
  });

  it('should have all event type constants', () => {
    expect(workflowEvents.EVENTS.TRANSITION_START).toBeDefined();
    expect(workflowEvents.EVENTS.TRANSITION_COMPLETE).toBeDefined();
    expect(workflowEvents.EVENTS.TRANSITION_FAILED).toBeDefined();
    expect(workflowEvents.EVENTS.PHASE_ENTERED).toBeDefined();
    expect(workflowEvents.EVENTS.WORKFLOW_RESET).toBeDefined();
  });
});
