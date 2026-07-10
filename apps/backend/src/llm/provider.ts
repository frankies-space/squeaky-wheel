import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type LlmProviderMode = 'mock' | 'live';

@Injectable()
export class LlmProviderService {
  constructor(private readonly config: ConfigService) {}

  getMode(): LlmProviderMode {
    const provider = this.config.get<string>('LLM_PROVIDER', 'mock');
    return provider === 'mock' ? 'mock' : 'live';
  }

  getModel(): LanguageModel {
    const provider = this.config.get<string>('LLM_PROVIDER', 'mock');
    if (provider === 'mock') {
      throw new Error('Mock mode does not use a language model');
    }

    const separator = provider.indexOf(':');
    if (separator === -1) {
      throw new Error(
        `Invalid LLM_PROVIDER "${provider}". Expected "mock" or "vendor:model" (e.g. anthropic:claude-sonnet-4-20250514).`,
      );
    }

    const vendor = provider.slice(0, separator);
    const modelId = provider.slice(separator + 1);

    if (vendor === 'anthropic') {
      return anthropic(modelId);
    }

    throw new Error(`Unsupported LLM vendor "${vendor}". Supported: anthropic`);
  }
}
