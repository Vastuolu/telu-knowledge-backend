import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  InternalServerErrorException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { UploadsService } from './uploads.service.js';
import { UploadsController } from './uploads.controller.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { configureApp } from '../main.js';

// Magic bytes minimal yang valid untuk deteksi file-type
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

const VALID_GIF_BUFFER = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00', 'binary');

const VALID_WEBP_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x4c, 0x0d, 0x00, 0x00, 0x00,
]);

describe('UploadsService & UploadsController', () => {
  let service: UploadsService;
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const BUCKET = 'article-images';
  const SUPABASE_URL = 'https://project-xyz.supabase.co';

  let mockUpload: ReturnType<typeof vi.fn>;
  let mockGetPublicUrl: ReturnType<typeof vi.fn>;
  let mockStorageFrom: ReturnType<typeof vi.fn>;
  let mockSupabaseService: SupabaseService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockUpload = vi.fn().mockImplementation((path: string) =>
      Promise.resolve({
        data: { id: 'obj-id', path, fullPath: `${BUCKET}/${path}` },
        error: null,
      }),
    );

    mockGetPublicUrl = vi.fn().mockImplementation((path: string) => ({
      data: {
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`,
      },
    }));

    mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    mockSupabaseService = {
      getAdminClient: vi.fn().mockReturnValue({
        storage: {
          from: mockStorageFrom,
        },
      }),
    } as unknown as SupabaseService;

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'SUPABASE_STORAGE_BUCKET') return BUCKET;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new UploadsService(mockSupabaseService, mockConfigService);
  });

  function makeMulterFile(
    buffer: Buffer,
    mimetype = 'application/octet-stream',
    size?: number,
  ): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: 'test-file.bin',
      encoding: '7bit',
      mimetype,
      size: size ?? buffer.length,
      buffer,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };
  }

  describe('Validasi isi file (magic bytes) & upload ke Supabase Storage', () => {
    it('harus menerima PNG, JPEG, GIF, dan WEBP berdasarkan isi file walaupun header Content-Type dari client palsu', async () => {
      const cases = [
        { buffer: VALID_PNG_BUFFER, expectedExt: 'png', expectedMime: 'image/png' },
        { buffer: VALID_JPEG_BUFFER, expectedExt: 'jpg', expectedMime: 'image/jpeg' },
        { buffer: VALID_GIF_BUFFER, expectedExt: 'gif', expectedMime: 'image/gif' },
        { buffer: VALID_WEBP_BUFFER, expectedExt: 'webp', expectedMime: 'image/webp' },
      ];

      for (const testCase of cases) {
        mockUpload.mockClear();
        const file = makeMulterFile(testCase.buffer, 'text/plain');

        const res = await service.uploadArticleImage(USER_ID, file);

        expect(res.statusCode).toBe(201);
        expect(res.isError).toBe(false);
        expect(mockStorageFrom).toHaveBeenCalledWith(BUCKET);

        const pathRegex = new RegExp(
          `^${USER_ID}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.${testCase.expectedExt}$`,
          'i',
        );
        expect(res.data.path).toMatch(pathRegex);
        expect(res.data.url).toBe(
          `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${res.data.path}`,
        );
        expect(mockUpload).toHaveBeenCalledWith(
          res.data.path,
          testCase.buffer,
          {
            contentType: testCase.expectedMime,
            upsert: false,
          },
        );
      }
    });

    it('harus menolak file bukan gambar (mis. SVG/HTML/teks) meskipun client mengirim Content-Type image/png', async () => {
      const fakePngHtml = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
        'utf8',
      );
      const file = makeMulterFile(fakePngHtml, 'image/png');

      await expect(service.uploadArticleImage(USER_ID, file)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('harus menolak jika file tidak disertakan (400 BadRequestException)', async () => {
      await expect(
        service.uploadArticleImage(USER_ID, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus menolak jika ukuran file > 4MB dengan 413 PayloadTooLargeException berbahasa Indonesia', async () => {
      const oversizedFile = makeMulterFile(
        VALID_PNG_BUFFER,
        'image/png',
        4 * 1024 * 1024 + 1,
      );

      await expect(
        service.uploadArticleImage(USER_ID, oversizedFile),
      ).rejects.toThrow(
        new PayloadTooLargeException(
          'Ukuran file terlalu besar. Maksimal ukuran file adalah 4MB.',
        ),
      );
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('harus melempar InternalServerErrorException bila Supabase Storage gagal mengunggah', async () => {
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Bucket not found' },
      });

      const file = makeMulterFile(VALID_PNG_BUFFER, 'image/png');
      await expect(service.uploadArticleImage(USER_ID, file)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Integrasi HTTP multipart/form-data (FileInterceptor limit 4MB -> 413 Bahasa Indonesia)', () => {
    it('harus mengembalikan 413 dengan pesan Bahasa Indonesia saat upload multipart melebihi 4MB', async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [UploadsController],
        providers: [
          UploadsService,
          { provide: SupabaseService, useValue: mockSupabaseService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      })
        .overrideGuard(SupabaseAuthGuard)
        .useValue({
          canActivate: (ctx: any) => {
            const req = ctx.switchToHttp().getRequest();
            req.user = { id: USER_ID };
            return true;
          },
        })
        .compile();

      const app = moduleFixture.createNestApplication<NestExpressApplication>();
      configureApp(app);
      await app.init();

      try {
        const bufferOver4Mb = Buffer.alloc(4 * 1024 * 1024 + 1024, 0x61);
        const response = await request(app.getHttpServer())
          .post('/api/uploads/article-image')
          .attach('file', bufferOver4Mb, 'oversized.png');

        expect(response.status).toBe(413);
        expect(response.body.isError).toBe(true);
        expect(response.body.message).toBe(
          'Ukuran file terlalu besar. Maksimal ukuran file adalah 4MB.',
        );
      } finally {
        await app.close();
      }
    });
  });
});

