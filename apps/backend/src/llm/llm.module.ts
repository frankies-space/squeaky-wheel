import { Module } from '@nestjs/common';
import { AntiStallModule } from '../anti-stall/anti-stall.module';
import { AuthModule } from '../auth/auth.module';
import { DailyProposalService } from './daily-proposal.service';
import { DecompositionService } from './decomposition.service';
import { OrchestratorTraceController } from './orchestrator-trace.controller';
import { OrchestratorTraceService } from './orchestrator-trace.service';
import { LlmProviderService } from './provider';

@Module({
  imports: [AuthModule, AntiStallModule],
  controllers: [OrchestratorTraceController],
  providers: [
    LlmProviderService,
    OrchestratorTraceService,
    DecompositionService,
    DailyProposalService,
  ],
  exports: [
    LlmProviderService,
    OrchestratorTraceService,
    DecompositionService,
    DailyProposalService,
  ],
})
export class LlmModule {}
