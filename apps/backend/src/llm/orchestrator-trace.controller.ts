import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import type {
  OrchestratorFlow,
  OrchestratorTrace,
  OrchestratorTraceStatus,
  OrchestratorTracesResponse,
} from '@squeaky-wheel/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { OrchestratorTraceService } from './orchestrator-trace.service';

@Controller('orchestrator/traces')
@UseGuards(AuthGuard)
export class OrchestratorTraceController {
  constructor(private readonly traceService: OrchestratorTraceService) {}

  @Get()
  list(
    @Query('flow') flow?: OrchestratorFlow,
    @Query('status') status?: OrchestratorTraceStatus,
    @Query('limit') limit?: string,
  ): OrchestratorTracesResponse {
    return this.traceService.listTraces({
      flow,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): OrchestratorTrace {
    const trace = this.traceService.getTrace(id);
    if (!trace) {
      throw new NotFoundException(`Orchestrator trace not found: ${id}`);
    }
    return trace;
  }
}
