import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  OrchestratorFlow,
  OrchestratorTrace,
  OrchestratorTraceStatus,
  OrchestratorTracesResponse,
} from '@squeaky-wheel/shared-types';

const MAX_TRACES = 200;

@Injectable()
export class OrchestratorTraceService {
  private readonly logger = new Logger('OrchestratorTrace');
  private readonly traces: OrchestratorTrace[] = [];

  startTrace(flow: OrchestratorFlow, userId: string, input: Record<string, unknown>): string {
    const trace: OrchestratorTrace = {
      id: randomUUID(),
      flow,
      status: 'running',
      userId,
      startedAt: new Date().toISOString(),
      input,
      steps: [{ name: 'started', at: new Date().toISOString() }],
    };

    this.traces.unshift(trace);
    if (this.traces.length > MAX_TRACES) {
      this.traces.length = MAX_TRACES;
    }

    this.logTrace(trace, 'started');
    return trace.id;
  }

  addStep(traceId: string, name: string, detail?: Record<string, unknown>): void {
    const trace = this.findTrace(traceId);
    if (!trace) return;

    trace.steps.push({
      name,
      at: new Date().toISOString(),
      detail,
    });
    this.logTrace(trace, `step:${name}`, detail);
  }

  completeTrace(
    traceId: string,
    output: Record<string, unknown>,
    outputMethod?: OrchestratorTrace['outputMethod'],
  ): void {
    const trace = this.findTrace(traceId);
    if (!trace) return;

    trace.status = 'success';
    trace.output = output;
    trace.outputMethod = outputMethod;
    trace.completedAt = new Date().toISOString();
    trace.durationMs = Date.parse(trace.completedAt) - Date.parse(trace.startedAt);
    this.logTrace(trace, 'success', { durationMs: trace.durationMs, outputMethod });
  }

  failTrace(traceId: string, error: unknown): void {
    const trace = this.findTrace(traceId);
    if (!trace) return;

    const message = error instanceof Error ? error.message : String(error);
    trace.status = 'error';
    trace.error = {
      message,
      name: error instanceof Error ? error.name : undefined,
    };
    trace.completedAt = new Date().toISOString();
    trace.durationMs = Date.parse(trace.completedAt) - Date.parse(trace.startedAt);
    this.logTrace(trace, 'error', { message, durationMs: trace.durationMs });
  }

  getTrace(traceId: string): OrchestratorTrace | undefined {
    return this.findTrace(traceId);
  }

  listTraces(options?: {
    flow?: OrchestratorFlow;
    status?: OrchestratorTraceStatus;
    limit?: number;
  }): OrchestratorTracesResponse {
    const limit = options?.limit ?? 50;
    let filtered = this.traces;

    if (options?.flow) {
      filtered = filtered.filter((trace) => trace.flow === options.flow);
    }

    if (options?.status) {
      filtered = filtered.filter((trace) => trace.status === options.status);
    }

    const traces = filtered.slice(0, limit);
    return { traces, total: traces.length };
  }

  async runTraced<T>(params: {
    flow: OrchestratorFlow;
    userId: string;
    input: Record<string, unknown>;
    outputMethod?: OrchestratorTrace['outputMethod'];
    fn: (traceId: string) => Promise<T>;
    toOutput?: (result: T) => Record<string, unknown>;
  }): Promise<{ result: T; traceId: string }> {
    const traceId = this.startTrace(params.flow, params.userId, params.input);

    try {
      const result = await params.fn(traceId);
      this.completeTrace(
        traceId,
        params.toOutput ? params.toOutput(result) : { ok: true },
        params.outputMethod,
      );
      return { result, traceId };
    } catch (error) {
      this.failTrace(traceId, error);
      throw error;
    }
  }

  private findTrace(traceId: string): OrchestratorTrace | undefined {
    return this.traces.find((trace) => trace.id === traceId);
  }

  private logTrace(
    trace: OrchestratorTrace,
    event: string,
    extra?: Record<string, unknown>,
  ): void {
    const payload = {
      event,
      traceId: trace.id,
      flow: trace.flow,
      status: trace.status,
      userId: trace.userId,
      durationMs: trace.durationMs,
      ...extra,
    };

    if (trace.status === 'error') {
      this.logger.error(JSON.stringify(payload));
      return;
    }

    this.logger.log(JSON.stringify(payload));
  }
}
