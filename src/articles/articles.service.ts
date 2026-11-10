import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ResponseHelper } from '../common/helpers/response.helper.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
import { GetMyArticlesQueryDto } from './dto/get-my-articles-query.dto.js';
import {
  ArticleDto,
  ArticleSummaryDto,
} from './dto/article-response.dto.js';
import {
  ArticleContentValidator,
  TiptapDoc,
} from './validators/article-content.validator.js';

interface ProfileJoinRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ArticleRow {
  id: string;
  author_id: string;
  title: string | null;
  subtitle: string | null;
  cover_image_url: string | null;
  content?: Record<string, unknown> | null;
  excerpt: string | null;
  reading_time_minutes: number | null;
  status: 'draft' | 'published';
  slug: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  profiles?: ProfileJoinRow | ProfileJoinRow[] | null;
}

const ARTICLE_DETAIL_SELECT =
  'id, author_id, title, subtitle, cover_image_url, content, excerpt, reading_time_minutes, status, slug, created_at, updated_at, published_at, profiles(id, display_name, avatar_url)';

const ARTICLE_SUMMARY_SELECT =
  'id, author_id, title, subtitle, cover_image_url, excerpt, reading_time_minutes, status, slug, created_at, updated_at, published_at, profiles(id, display_name, avatar_url)';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ISO_TIMESTAMP_SAFE_REGEX = /^[0-9T:.\-+Z]+$/;

@Injectable()
export class ArticlesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly contentValidator: ArticleContentValidator,
  ) {}

  async createDraft(userId: string, dto: CreateArticleDto) {
    this.contentValidator.validateCoverImageUrl(dto.coverImageUrl);

    const sanitizedContent: TiptapDoc =
      dto.content !== undefined
        ? this.contentValidator.validateAndSanitize(dto.content)
        : { type: 'doc', content: [] };

    const excerpt = this.contentValidator.computeExcerpt(sanitizedContent);
    const readingTimeMinutes =
      this.contentValidator.computeReadingTimeMinutes(sanitizedContent);

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .insert({
        author_id: userId,
        title: dto.title ?? '',
        subtitle: dto.subtitle ?? '',
        cover_image_url: dto.coverImageUrl ?? null,
        content: sanitizedContent,
        excerpt,
        reading_time_minutes: readingTimeMinutes,
        status: 'draft',
      })
      .select(ARTICLE_DETAIL_SELECT)
      .single();

    if (error || !data) {
      throw new InternalServerErrorException('Gagal membuat draft artikel');
    }

    return ResponseHelper.success(
      201,
      'Draft artikel berhasil dibuat',
      this.mapToArticleDto(data as unknown as ArticleRow),
    );
  }

  async getMyArticles(userId: string, query: GetMyArticlesQueryDto) {
    const limit = query.limit ?? 20;

    let qb = this.supabaseService
      .getAdminClient()
      .from('articles')
      .select(ARTICLE_SUMMARY_SELECT)
      .eq('author_id', userId);

    if (query.status) {
      qb = qb.eq('status', query.status);
    }

    if (query.cursor) {
      const { updatedAt, id } = this.decodeCursor(query.cursor);
      qb = qb.or(
        `updated_at.lt.${updatedAt},and(updated_at.eq.${updatedAt},id.lt.${id})`,
      );
    }

    const { data, error } = await qb
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (error) {
      throw new InternalServerErrorException('Gagal mengambil daftar artikel');
    }

    const rows = (data ?? []) as unknown as ArticleRow[];
    const hasMore = rows.length > limit;
    const slicedRows = hasMore ? rows.slice(0, limit) : rows;
    const items = slicedRows.map((row) => this.mapToArticleSummaryDto(row));
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? this.encodeCursor(lastItem.updatedAt, lastItem.id)
        : null;

    return ResponseHelper.success(200, 'Daftar artikel berhasil diambil', {
      items,
      nextCursor,
    });
  }

  async getArticleById(userId: string, articleId: string) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .select(ARTICLE_DETAIL_SELECT)
      .eq('id', articleId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    const row = data as unknown as ArticleRow;
    if (row.author_id !== userId && row.status !== 'published') {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    return ResponseHelper.success(
      200,
      'Artikel berhasil diambil',
      this.mapToArticleDto(row),
    );
  }

  async updateArticle(
    userId: string,
    articleId: string,
    dto: UpdateArticleDto,
  ) {
    const ownershipSelect =
      dto.content !== undefined ? ARTICLE_DETAIL_SELECT : 'id, author_id';

    const { data: existingData, error: findError } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .select(ownershipSelect)
      .eq('id', articleId)
      .eq('author_id', userId)
      .maybeSingle();

    if (findError || !existingData) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    if (dto.coverImageUrl !== undefined) {
      this.contentValidator.validateCoverImageUrl(dto.coverImageUrl);
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.title !== undefined) {
      updatePayload.title = dto.title ?? '';
    }
    if (dto.subtitle !== undefined) {
      updatePayload.subtitle = dto.subtitle ?? '';
    }
    if (dto.coverImageUrl !== undefined) {
      updatePayload.cover_image_url = dto.coverImageUrl;
    }
    if (dto.content !== undefined) {
      const sanitizedContent = this.contentValidator.validateAndSanitize(
        dto.content,
      );
      updatePayload.content = sanitizedContent;
      updatePayload.excerpt =
        this.contentValidator.computeExcerpt(sanitizedContent);
      updatePayload.reading_time_minutes =
        this.contentValidator.computeReadingTimeMinutes(sanitizedContent);
    }

    const { data: updatedData, error: updateError } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .update(updatePayload)
      .eq('id', articleId)
      .eq('author_id', userId)
      .select(ARTICLE_DETAIL_SELECT)
      .single();

    if (updateError || !updatedData) {
      throw new InternalServerErrorException('Gagal memperbarui artikel');
    }

    return ResponseHelper.success(
      200,
      'Artikel berhasil diperbarui',
      this.mapToArticleDto(updatedData as unknown as ArticleRow),
    );
  }

  async publishArticle(userId: string, articleId: string) {
    const { data: existingData, error: findError } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .select(ARTICLE_DETAIL_SELECT)
      .eq('id', articleId)
      .eq('author_id', userId)
      .maybeSingle();

    if (findError || !existingData) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    const existing = existingData as unknown as ArticleRow;

    const validationErrors: string[] = [];
    const trimmedTitle = (existing.title ?? '').trim();

    if (trimmedTitle.length < 1) {
      validationErrors.push('Judul artikel wajib diisi (minimal 1 karakter)');
    } else if (trimmedTitle.length > 150) {
      validationErrors.push('Judul artikel maksimal 150 karakter');
    }

    if (!this.contentValidator.hasNonEmptyText(existing.content)) {
      validationErrors.push(
        'Konten artikel wajib memiliki minimal satu teks yang tidak kosong',
      );
    }

    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    const sanitizedContent = this.contentValidator.validateAndSanitize(
      existing.content,
    );
    this.contentValidator.validateCoverImageUrl(existing.cover_image_url);

    const now = new Date().toISOString();
    const publishedAt = existing.published_at ?? now;
    const slug = existing.slug ?? this.generateSlug(trimmedTitle);
    const excerpt = this.contentValidator.computeExcerpt(sanitizedContent);
    const readingTimeMinutes =
      this.contentValidator.computeReadingTimeMinutes(sanitizedContent);

    const { data: updatedData, error: updateError } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .update({
        status: 'published',
        published_at: publishedAt,
        slug,
        content: sanitizedContent,
        excerpt,
        reading_time_minutes: readingTimeMinutes,
        updated_at: now,
      })
      .eq('id', articleId)
      .eq('author_id', userId)
      .select(ARTICLE_DETAIL_SELECT)
      .single();

    if (updateError || !updatedData) {
      throw new InternalServerErrorException('Gagal mempublikasikan artikel');
    }

    return ResponseHelper.success(
      200,
      'Artikel berhasil dipublikasikan',
      this.mapToArticleDto(updatedData as unknown as ArticleRow),
    );
  }

  async unpublishArticle(userId: string, articleId: string) {
    const { data: existingData, error: findError } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .select('id, author_id')
      .eq('id', articleId)
      .eq('author_id', userId)
      .maybeSingle();

    if (findError || !existingData) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    const now = new Date().toISOString();

    const { data: updatedData, error: updateError } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .update({
        status: 'draft',
        updated_at: now,
      })
      .eq('id', articleId)
      .eq('author_id', userId)
      .select(ARTICLE_DETAIL_SELECT)
      .single();

    if (updateError || !updatedData) {
      throw new InternalServerErrorException(
        'Gagal membatalkan publikasi artikel',
      );
    }

    return ResponseHelper.success(
      200,
      'Publikasi artikel berhasil dibatalkan',
      this.mapToArticleDto(updatedData as unknown as ArticleRow),
    );
  }

  async deleteArticle(userId: string, articleId: string) {
    const { data: existingData, error: findError } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .select('id, author_id')
      .eq('id', articleId)
      .eq('author_id', userId)
      .maybeSingle();

    if (findError || !existingData) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    const { error: deleteError } = await this.supabaseService
      .getAdminClient()
      .from('articles')
      .delete()
      .eq('id', articleId)
      .eq('author_id', userId);

    if (deleteError) {
      throw new InternalServerErrorException('Gagal menghapus artikel');
    }

    return ResponseHelper.success(200, 'Artikel berhasil dihapus', null);
  }

  encodeCursor(updatedAt: string, id: string): string {
    return Buffer.from(`${updatedAt}|${id}`, 'utf8').toString('base64');
  }

  decodeCursor(cursor: string): { updatedAt: string; id: string } {
    if (!cursor || typeof cursor !== 'string') {
      throw new BadRequestException('Cursor tidak valid');
    }

    let decoded: string;
    try {
      decoded = Buffer.from(cursor, 'base64').toString('utf8');
    } catch {
      throw new BadRequestException('Cursor tidak valid');
    }

    const parts = decoded.split('|');
    if (parts.length !== 2) {
      throw new BadRequestException('Cursor tidak valid');
    }

    const [updatedAt, id] = parts;
    if (
      !updatedAt ||
      !ISO_TIMESTAMP_SAFE_REGEX.test(updatedAt) ||
      Number.isNaN(Date.parse(updatedAt)) ||
      !UUID_REGEX.test(id)
    ) {
      throw new BadRequestException('Cursor tidak valid');
    }

    return { updatedAt, id };
  }

  generateSlug(title: string): string {
    const base = title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '');

    const safeBase = base || 'artikel';
    const suffix = randomBytes(4).toString('hex');
    return `${safeBase}-${suffix}`;
  }

  private mapToArticleSummaryDto(row: ArticleRow): ArticleSummaryDto {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;

    return {
      id: row.id,
      title: row.title ?? '',
      subtitle: row.subtitle ?? null,
      coverImageUrl: row.cover_image_url ?? null,
      excerpt: row.excerpt ?? '',
      readingTimeMinutes: row.reading_time_minutes ?? 1,
      status: row.status,
      slug: row.slug ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at ?? null,
      author: {
        id: profile?.id ?? row.author_id,
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      },
    };
  }

  private mapToArticleDto(row: ArticleRow): ArticleDto {
    return {
      ...this.mapToArticleSummaryDto(row),
      content: (row.content as Record<string, unknown>) ?? {
        type: 'doc',
        content: [],
      },
    };
  }
}

