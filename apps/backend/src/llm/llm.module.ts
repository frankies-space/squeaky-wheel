import { Module } from '@nestjs/common';
import { DecompositionService } from './decomposition.service';
import { LlmProviderService } from './provider';

@Module({
  providers: [LlmProviderService, DecompositionService],
  exports: [LlmProviderService, DecompositionService],
})
export class LlmModule {}
