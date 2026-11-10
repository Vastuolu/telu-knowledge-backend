import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GoogleGenAI } from '@google/genai';
import { AiService, TELU_SYSTEM_INSTRUCTION } from './ai.service.js';

describe('AiService', () => {
  let service: AiService;
  let mockGenerateContent: ReturnType<typeof vi.fn>;
  let currentModel: string;

  const USER_1 = '11111111-1111-4111-8111-111111111111';
  const USER_2 = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    currentModel = 'gemini-2.5-flash';
    mockGenerateContent = vi.fn().mockResolvedValue({
      text: 'Hasil parafrase dari Telu.',
    });

    const mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'dummy-gemini-key';
        if (key === 'GEMINI_MODEL') return currentModel;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new AiService(mockConfigService);
    vi.spyOn(
      service as unknown as { createClient: () => GoogleGenAI },
      'createClient',
    ).mockReturnValue({
      models: {
        generateContent: mockGenerateContent,
      },
    } as unknown as GoogleGenAI);
  });

  it('harus memanggil Gemini dengan systemInstruction Telu, pembatas data, dan thinkingBudget=0 untuk gemini-2.5-flash', async () => {
    const res = await service.assist(USER_1, {
      action: 'paraphrase',
      selectedText: 'Kalimat asli yang ingin diparafrasekan.',
      contextBefore: 'Kalimat sebelum.',
      contextAfter: 'Kalimat sesudah.',
    });

    expect(res.statusCode).toBe(200);
    expect(res.isError).toBe(false);
    expect(res.data).toEqual({ text: 'Hasil parafrase dari Telu.' });

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.model).toBe('gemini-2.5-flash');
    expect(callArg.config).toEqual({
      systemInstruction: TELU_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 0 },
    });
    expect(callArg.contents).toContain('<selected_text>');
    expect(callArg.contents).toContain('Kalimat asli yang ingin diparafrasekan.');
    expect(callArg.contents).toContain('<context_before>');
    expect(callArg.contents).toContain('<context_after>');
  });

  it('harus mewajibkan instruction jika action adalah custom', async () => {
    await expect(
      service.assist(USER_1, {
        action: 'custom',
        selectedText: 'Teks contoh.',
      }),
    ).rejects.toThrow(BadRequestException);

    const okRes = await service.assist(USER_1, {
      action: 'custom',
      instruction: 'Terjemahkan ke istilah akademik.',
      selectedText: 'Teks contoh.',
    });
    expect(okRes.statusCode).toBe(200);
    expect(mockGenerateContent.mock.calls[0][0].contents).toContain(
      '<custom_instruction>',
    );
  });

  it('harus membatasi rate limit per user maksimal 10 permintaan per menit (in-memory Map)', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await service.assist(USER_1, {
        action: 'shorten',
        selectedText: `Teks ke-${i}`,
      });
      expect(res.statusCode).toBe(200);
    }

    // Permintaan ke-11 dari USER_1 harus ditolak 429
    try {
      await service.assist(USER_1, {
        action: 'shorten',
        selectedText: 'Teks ke-11',
      });
      expect.fail('Harusnya melempar 429 Too Many Requests');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // USER_2 tetap bisa mengakses (rate limit bersifat per-user)
    const user2Res = await service.assist(USER_2, {
      action: 'shorten',
      selectedText: 'Teks milik user 2',
    });
    expect(user2Res.statusCode).toBe(200);
  });

  it('harus memetakan error 429 / RESOURCE_EXHAUSTED dari provider menjadi 429 "Layanan AI sedang sibuk" tanpa membocorkan detail error provider', async () => {
    mockGenerateContent.mockRejectedValueOnce({
      status: 429,
      message: 'Quota exceeded for metric: secret-internal-project-id',
    });

    try {
      await service.assist(USER_1, {
        action: 'formal',
        selectedText: 'Teks uji.',
      });
      expect.fail('Harusnya melempar HttpException 429');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(httpErr.message).toBe('Layanan AI sedang sibuk');
      expect(httpErr.message).not.toContain('secret-internal-project-id');
    }
  });

  it('harus memetakan error provider lainnya menjadi 502 BadGatewayException generik tanpa membocorkan pesan asli provider', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('Internal Google API key invalid: AIzaSySecretKey'),
    );

    try {
      await service.assist(USER_1, {
        action: 'fix_grammar',
        selectedText: 'Teks uji.',
      });
      expect.fail('Harusnya melempar BadGatewayException 502');
    } catch (err) {
      expect(err).toBeInstanceOf(BadGatewayException);
      const httpErr = err as BadGatewayException;
      expect(httpErr.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(httpErr.message).not.toContain('AIzaSySecretKey');
    }
  });

  it('harus menggunakan frasa "Kembangkan dan uraikan" pada prompt aksi expand', () => {
    const prompt = service.buildPrompt({
      action: 'expand',
      selectedText: 'Contoh teks pendek.',
    });
    expect(prompt).toContain('Kembangkan dan uraikan');
    expect(prompt).not.toContain('danuraikan');
  });

  it('harus mencatat logger HANYA model dan kode error provider saat error terjadi', async () => {
    const loggerSpy = vi
      .spyOn((service as unknown as { logger: { error: (...args: unknown[]) => void } }).logger, 'error')
      .mockImplementation(() => {});

    mockGenerateContent.mockRejectedValueOnce({
      status: 403,
      message: 'Sensitive prompt or key that must not be logged',
    });

    await expect(
      service.assist(USER_1, {
        action: 'shorten',
        selectedText: 'Sensitive prompt text',
      }),
    ).rejects.toThrow(BadGatewayException);

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    const logMessage = loggerSpy.mock.calls[0][0] as string;
    expect(logMessage).toContain('model=gemini-2.5-flash');
    expect(logMessage).toContain('code=403');
    expect(logMessage).not.toContain('Sensitive prompt text');
    expect(logMessage).not.toContain('Sensitive prompt or key');
  });

  it('harus membersihkan entri kosong di Map rate limit per user saat timestamps kedaluwarsa', async () => {
    const userRequestsMap = (
      service as unknown as { userRequests: Map<string, number[]> }
    ).userRequests;

    // Masukkan entri user lama yang sudah melewati window 60 detik
    userRequestsMap.set('expired-user-1', [Date.now() - 100_000]);
    userRequestsMap.set('expired-user-2', [Date.now() - 80_000]);

    expect(userRequestsMap.has('expired-user-1')).toBe(true);
    expect(userRequestsMap.has('expired-user-2')).toBe(true);

    // Saat user aktif memanggil assist, map harus membersihkan entri yang sudah kadaluwarsa
    await service.assist(USER_1, {
      action: 'casual',
      selectedText: 'Halo dunia.',
    });

    expect(userRequestsMap.has('expired-user-1')).toBe(false);
    expect(userRequestsMap.has('expired-user-2')).toBe(false);
    expect(userRequestsMap.has(USER_1)).toBe(true);
  });
});

