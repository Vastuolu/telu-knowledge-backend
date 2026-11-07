import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticlesService, ArticleRow } from './articles.service.js';
import { ArticleContentValidator } from './validators/article-content.validator.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let validator: ArticleContentValidator;

  const OWNER_ID = '11111111-1111-4111-8111-111111111111';
  const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
  const ARTICLE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const ARTICLE_ID_2 = '550e8400-e29b-41d4-a716-446655440000';
  const SUPABASE_URL = 'https://project-xyz.supabase.co';
  const BUCKET = 'article-images';

  let mockQueryBuilder: {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  };

  let mockFrom: ReturnType<typeof vi.fn>;

  function createSampleRow(overrides: Partial<ArticleRow> = {}): ArticleRow {
    return {
      id: ARTICLE_ID,
      author_id: OWNER_ID,
      title: 'Judul Artikel Awal',
      subtitle: 'Subjudul Artikel',
      cover_image_url: null,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Konten awal artikel.' }],
          },
        ],
      },
      excerpt: 'Konten awal artikel.',
      reading_time_minutes: 1,
      status: 'draft',
      slug: null,
      created_at: '2026-11-07T10:00:00.000Z',
      updated_at: '2026-11-07T10:05:00.000Z',
      published_at: null,
      profiles: {
        id: OWNER_ID,
        display_name: 'Mahasiswa TelU',
        avatar_url: 'https://example.com/avatar.png',
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    mockQueryBuilder = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    mockFrom = vi.fn().mockReturnValue(mockQueryBuilder);

    const mockSupabaseService = {
      getAdminClient: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as unknown as SupabaseService;

    const mockConfigService = {
      getOrThrow: (key: string) => {
        if (key === 'SUPABASE_URL') return SUPABASE_URL;
        throw new Error(`Missing key: ${key}`);
      },
      get: (key: string) => {
        if (key === 'SUPABASE_STORAGE_BUCKET') return BUCKET;
        return undefined;
      },
    } as unknown as ConfigService;

    validator = new ArticleContentValidator(mockConfigService);
    service = new ArticlesService(mockSupabaseService, validator);
  });

  describe('Kepemilikan & akses artikel (non-owner -> 404)', () => {
    it('GET /articles/:id harus mengizinkan pemilik melihat artikel draft miliknya', async () => {
      const draftRow = createSampleRow({ status: 'draft' });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: draftRow,
        error: null,
      });

      const res = await service.getArticleById(OWNER_ID, ARTICLE_ID);

      expect(res.statusCode).toBe(200);
      expect(res.data.id).toBe(ARTICLE_ID);
      expect(res.data.author).toEqual({
        id: OWNER_ID,
        displayName: 'Mahasiswa TelU',
        avatarUrl: 'https://example.com/avatar.png',
      });
    });

    it('GET /articles/:id harus mengembalikan 404 (bukan 403) jika bukan pemilik mengakses artikel draft', async () => {
      const draftRow = createSampleRow({ status: 'draft' });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: draftRow,
        error: null,
      });

      await expect(
        service.getArticleById(OTHER_USER_ID, ARTICLE_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('GET /articles/:id harus mengizinkan bukan pemilik melihat artikel yang sudah published', async () => {
      const publishedRow = createSampleRow({
        status: 'published',
        slug: 'judul-artikel-awal-1234abcd',
        published_at: '2026-11-07T11:00:00.000Z',
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: publishedRow,
        error: null,
      });

      const res = await service.getArticleById(OTHER_USER_ID, ARTICLE_ID);

      expect(res.statusCode).toBe(200);
      expect(res.data.status).toBe('published');
    });

    it('PATCH /articles/:id harus mengembalikan 404 jika artikel bukan milik pengguna', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.updateArticle(OTHER_USER_ID, ARTICLE_ID, {
          title: 'Bajakan',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('author_id', OTHER_USER_ID);
    });

    it('POST /articles/:id/publish harus mengembalikan 404 jika artikel bukan milik pengguna', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.publishArticle(OTHER_USER_ID, ARTICLE_ID),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('author_id', OTHER_USER_ID);
    });
  });

  describe('PATCH /articles/:id (perhitungan ulang excerpt & readingTimeMinutes)', () => {
    it('harus menghitung ulang excerpt (160 karakter) dan readingTimeMinutes (kata/200, min 1)', async () => {
      const existingRow = createSampleRow();
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingRow,
        error: null,
      });

      const words250 = Array.from({ length: 250 }, (_, i) => `kata${i}`).join(
        ' ',
      );
      const newContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: words250 }],
          },
        ],
      };

      const expectedExcerpt = words250.slice(0, 160);
      const updatedRow = createSampleRow({
        content: newContent,
        excerpt: expectedExcerpt,
        reading_time_minutes: 2,
      });
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: updatedRow,
        error: null,
      });

      const res = await service.updateArticle(OWNER_ID, ARTICLE_ID, {
        content: newContent,
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          excerpt: expectedExcerpt,
          reading_time_minutes: 2,
        }),
      );
      expect(res.data.excerpt.length).toBe(160);
      expect(res.data.readingTimeMinutes).toBe(2);
    });
  });

  describe('POST /articles/:id/publish (validasi & idempotensi)', () => {
    it('harus gagal 400 dengan message berupa array Bahasa Indonesia bila title kosong dan content kosong', async () => {
      const emptyDraft = createSampleRow({
        title: '   ',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '   ' }],
            },
          ],
        },
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: emptyDraft,
        error: null,
      });

      try {
        await service.publishArticle(OWNER_ID, ARTICLE_ID);
        expect.fail('Harusnya melempar BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const response = (err as BadRequestException).getResponse() as {
          message: string[];
        };
        expect(Array.isArray(response.message)).toBe(true);
        expect(response.message.length).toBe(2);
      }
    });

    it('harus mengeset status published, publishedAt, dan slug saat pertama kali dipublish', async () => {
      const validDraft = createSampleRow({
        title: 'Belajar NestJS dan Supabase',
        status: 'draft',
        slug: null,
        published_at: null,
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: validDraft,
        error: null,
      });

      mockQueryBuilder.single.mockImplementationOnce(() => {
        const updateArg = mockQueryBuilder.update.mock.calls[0][0] as {
          status: 'published';
          published_at: string;
          slug: string;
        };
        return Promise.resolve({
          data: createSampleRow({
            title: 'Belajar NestJS dan Supabase',
            status: updateArg.status,
            published_at: updateArg.published_at,
            slug: updateArg.slug,
          }),
          error: null,
        });
      });

      const res = await service.publishArticle(OWNER_ID, ARTICLE_ID);

      expect(res.statusCode).toBe(200);
      expect(res.data.status).toBe('published');
      expect(res.data.publishedAt).toBeTruthy();
      expect(res.data.slug).toMatch(/^belajar-nestjs-dan-supabase-[0-9a-f]{8}$/);
    });

    it('harus bersifat idempoten (mempertahankan publishedAt dan slug yang sudah ada)', async () => {
      const existingPublishedAt = '2026-11-01T08:00:00.000Z';
      const existingSlug = 'belajar-nestjs-dan-supabase-existing1';
      const alreadyPublished = createSampleRow({
        title: 'Belajar NestJS dan Supabase',
        status: 'published',
        published_at: existingPublishedAt,
        slug: existingSlug,
      });

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: alreadyPublished,
        error: null,
      });
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: alreadyPublished,
        error: null,
      });

      const res = await service.publishArticle(OWNER_ID, ARTICLE_ID);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          published_at: existingPublishedAt,
          slug: existingSlug,
        }),
      );
      expect(res.data.publishedAt).toBe(existingPublishedAt);
      expect(res.data.slug).toBe(existingSlug);
    });
  });

  describe('GET /articles/me & Cursor Pagination', () => {
    it('harus mengembalikan items tanpa field content serta menghasilkan nextCursor bila ada halaman berikutnya', async () => {
      const row1 = createSampleRow({
        id: ARTICLE_ID,
        updated_at: '2026-11-07T12:00:00.000Z',
      });
      const row2 = createSampleRow({
        id: ARTICLE_ID_2,
        updated_at: '2026-11-07T11:00:00.000Z',
      });

      // limit = 1 -> query mengambil limit + 1 = 2 baris
      mockQueryBuilder.limit.mockResolvedValueOnce({
        data: [row1, row2],
        error: null,
      });

      const res = await service.getMyArticles(OWNER_ID, {
        status: 'draft',
        limit: 1,
      });

      expect(res.statusCode).toBe(200);
      expect(res.data.items).toHaveLength(1);
      expect('content' in res.data.items[0]).toBe(false);

      const expectedCursor = Buffer.from(
        `2026-11-07T12:00:00.000Z|${ARTICLE_ID}`,
        'utf8',
      ).toString('base64');
      expect(res.data.nextCursor).toBe(expectedCursor);
    });

    it('harus mem-parsing cursor yang valid dan menerapkannya pada filter keyset pagination', async () => {
      const cursor = service.encodeCursor(
        '2026-11-07T12:00:00.000Z',
        ARTICLE_ID,
      );
      const row2 = createSampleRow({
        id: ARTICLE_ID_2,
        updated_at: '2026-11-07T11:00:00.000Z',
      });

      mockQueryBuilder.limit.mockResolvedValueOnce({
        data: [row2],
        error: null,
      });

      const res = await service.getMyArticles(OWNER_ID, {
        limit: 20,
        cursor,
      });

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        `updated_at.lt.2026-11-07T12:00:00.000Z,and(updated_at.eq.2026-11-07T12:00:00.000Z,id.lt.${ARTICLE_ID})`,
      );
      expect(res.data.items).toHaveLength(1);
      expect(res.data.nextCursor).toBeNull();
    });

    it('harus menolak cursor yang tidak valid dengan BadRequestException (400)', async () => {
      await expect(
        service.getMyArticles(OWNER_ID, { cursor: 'bukan-base64-valid' }),
      ).rejects.toThrow(BadRequestException);

      const badFormatCursor = Buffer.from(
        'bukan-tanggal|bukan-uuid',
        'utf8',
      ).toString('base64');
      await expect(
        service.getMyArticles(OWNER_ID, { cursor: badFormatCursor }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

