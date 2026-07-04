import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env.ts', () => ({
  env: {
    GEMINI_API_KEY: 'test-key-123',
  },
}));

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function () {
    this.models = { generateContent: mockGenerateContent };
  }),
}));

import { AiService } from '../../services/ai.service.ts';

describe('AiService', () => {
  let service: AiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AiService();
  });

  it('throws 503 when API key is missing', async () => {
    vi.resetModules();
    vi.doMock('../../config/env.ts', () => ({
      env: { GEMINI_API_KEY: 'MY_GEMINI_API_KEY' },
    }));
    const { AiService: OfflineService } = await import('../../services/ai.service.ts');
    const svc = new OfflineService();
    await expect(svc.assist({ prompt: 'hello' })).rejects.toThrow('AI Assist is currently offline');
  });

  it('calls Gemini with system instruction and prompt', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'Distillation separates compounds by boiling point.' });

    const result = await service.assist({ prompt: 'What is distillation?' });

    expect(result).toBe('Distillation separates compounds by boiling point.');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.model).toBe('gemini-2.0-flash');
    expect(call.config.systemInstruction).toContain('Hemp-OS AI');
    expect(call.contents).toContain('What is distillation?');
  });

  it('includes graph context in the prompt', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'OK' });

    await service.assist({
      prompt: 'Explain',
      graph: { stages: [{ name: 'Extraction', type: 'extraction', config: {} }] },
      currentResults: { massBalanceReport: { yield: 95 } },
      selectedBiomassName: 'OG Kush',
    });

    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.contents).toContain('OG Kush');
    expect(call.contents).toContain('Extraction (extraction)');
    expect(call.contents).toContain('95');
  });

  it('propagates Gemini errors', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Rate limited'));

    await expect(service.assist({ prompt: 'hi' })).rejects.toThrow('Rate limited');
  });
});
