import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@supabase/supabase-js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';
import { BEARER_AUTH_NAME } from '../common/swagger/swagger.setup.js';
import {
  ApiErrorResponseDto,
  INTERNAL_SERVER_ERROR_EXAMPLE,
} from '../common/swagger/api-response.dto.js';
import { ArticlesService } from './articles.service.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
import { GetMyArticlesQueryDto } from './dto/get-my-articles-query.dto.js';
import {
  ArticleDetailResponseDto,
  CreateArticleResponseDto,
  MyArticlesListResponseDto,
  PublishArticleResponseDto,
  UpdateArticleResponseDto,
} from './dto/article-response.dto.js';

const UNAUTHORIZED_EXAMPLES = {
  missingToken: {
    summary: 'Token tidak dikirim',
    value: {
      statusCode: 401,
      message: 'Access token tidak ditemukan',
      isError: true,
      data: null,
    },
  },
  invalidToken: {
    summary: 'Token tidak valid / kedaluwarsa',
    value: {
      statusCode: 401,
      message: 'Access token tidak valid',
      isError: true,
      data: null,
    },
  },
};

const ARTICLE_NOT_FOUND_EXAMPLE = {
  statusCode: 404,
  message: 'Artikel tidak ditemukan',
  isError: true,
  data: null,
};

@ApiTags('Articles')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth(BEARER_AUTH_NAME)
@ApiUnauthorizedResponse({
  description: 'Token tidak dikirim atau tidak valid',
  type: ApiErrorResponseDto,
  examples: UNAUTHORIZED_EXAMPLES,
})
@ApiTooManyRequestsResponse({
  description: 'Terlalu banyak permintaan (rate limit terlampaui)',
  type: ApiErrorResponseDto,
  example: {
    statusCode: 429,
    message: 'Terlalu banyak permintaan, silakan coba beberapa saat lagi.',
    isError: true,
    data: null,
  },
})
@ApiInternalServerErrorResponse({
  description: 'Kesalahan tak terduga di server',
  type: ApiErrorResponseDto,
  example: INTERNAL_SERVER_ERROR_EXAMPLE,
})
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @ApiOperation({
    summary: 'Buat draft artikel baru',
    description:
      'Membuat draft artikel baru di Editor Studio. Semua field pada body bersifat opsional.',
  })
  @ApiCreatedResponse({
    description: 'Draft artikel berhasil dibuat',
    type: CreateArticleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validasi body atau struktur konten Tiptap gagal',
    type: ApiErrorResponseDto,
    examples: {
      validation: {
        summary: 'Validasi field gagal',
        value: {
          statusCode: 400,
          message: ['Judul artikel maksimal 150 karakter'],
          isError: true,
          data: null,
        },
      },
      invalidContent: {
        summary: 'Node/mark konten Tiptap tidak diizinkan',
        value: {
          statusCode: 400,
          message: 'Tipe node "script" tidak diizinkan dalam konten artikel',
          isError: true,
          data: null,
        },
      },
    },
  })
  createDraft(@GetUser() user: User, @Body() dto: CreateArticleDto) {
    return this.articlesService.createDraft(user.id, dto);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Daftar artikel milik sendiri',
    description:
      'Mengambil daftar artikel milik pengguna yang sedang login (tanpa field content) dengan urutan updated_at DESC, id DESC dan cursor pagination.',
  })
  @ApiOkResponse({
    description: 'Daftar artikel berhasil diambil',
    type: MyArticlesListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parameter query atau cursor tidak valid',
    type: ApiErrorResponseDto,
    examples: {
      invalidQuery: {
        summary: 'Filter status atau limit tidak valid',
        value: {
          statusCode: 400,
          message: [
            'Status harus bernilai draft atau published',
            'Limit maksimal 50',
          ],
          isError: true,
          data: null,
        },
      },
      invalidCursor: {
        summary: 'Cursor pagination tidak valid',
        value: {
          statusCode: 400,
          message: 'Cursor tidak valid',
          isError: true,
          data: null,
        },
      },
    },
  })
  getMyArticles(
    @GetUser() user: User,
    @Query() query: GetMyArticlesQueryDto,
  ) {
    return this.articlesService.getMyArticles(user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ambil detail artikel berdasarkan ID',
    description:
      'Pemilik artikel dapat melihat semua status (draft/published). Pengguna lain hanya dapat melihat artikel berstatus published; selain itu mengembalikan 404.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID artikel',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiOkResponse({
    description: 'Artikel berhasil diambil',
    type: ArticleDetailResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Format UUID tidak valid',
    type: ApiErrorResponseDto,
    example: {
      statusCode: 400,
      message: 'Validation failed (uuid is expected)',
      isError: true,
      data: null,
    },
  })
  @ApiNotFoundResponse({
    description: 'Artikel tidak ditemukan atau bukan milik pengguna (masih draft)',
    type: ApiErrorResponseDto,
    example: ARTICLE_NOT_FOUND_EXAMPLE,
  })
  getArticleById(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.articlesService.getArticleById(user.id, id);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({
    summary: 'Perbarui artikel (autosave / partial update)',
    description:
      'Memperbarui sebagian field artikel milik sendiri dan menghitung ulang excerpt serta readingTimeMinutes dari content.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID artikel',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiOkResponse({
    description: 'Artikel berhasil diperbarui',
    type: UpdateArticleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Format UUID, field body, atau konten Tiptap tidak valid',
    type: ApiErrorResponseDto,
    example: {
      statusCode: 400,
      message: ['Judul artikel maksimal 150 karakter'],
      isError: true,
      data: null,
    },
  })
  @ApiNotFoundResponse({
    description: 'Artikel tidak ditemukan atau bukan milik pengguna',
    type: ApiErrorResponseDto,
    example: ARTICLE_NOT_FOUND_EXAMPLE,
  })
  updateArticle(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articlesService.updateArticle(user.id, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Publikasikan artikel',
    description:
      'Memvalidasi kelengkapan judul (1-150 karakter) dan konten (minimal satu teks non-kosong), mengubah status menjadi published, serta mengatur publishedAt dan slug secara idempoten.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID artikel',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiOkResponse({
    description: 'Artikel berhasil dipublikasikan',
    type: PublishArticleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Syarat publikasi belum terpenuhi (judul/konten kosong)',
    type: ApiErrorResponseDto,
    example: {
      statusCode: 400,
      message: [
        'Judul artikel wajib diisi (minimal 1 karakter)',
        'Konten artikel wajib memiliki minimal satu teks yang tidak kosong',
      ],
      isError: true,
      data: null,
    },
  })
  @ApiNotFoundResponse({
    description: 'Artikel tidak ditemukan atau bukan milik pengguna',
    type: ApiErrorResponseDto,
    example: ARTICLE_NOT_FOUND_EXAMPLE,
  })
  publishArticle(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.articlesService.publishArticle(user.id, id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Batalkan publikasi artikel',
    description:
      'Mengubah status artikel milik sendiri dari published kembali menjadi draft.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID artikel',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiOkResponse({
    description: 'Publikasi artikel berhasil dibatalkan',
    type: PublishArticleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Artikel tidak ditemukan atau bukan milik pengguna',
    type: ApiErrorResponseDto,
    example: ARTICLE_NOT_FOUND_EXAMPLE,
  })
  unpublishArticle(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.articlesService.unpublishArticle(user.id, id);
  }
}

