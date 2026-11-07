import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../common/swagger/api-response.dto.js';

export class ArticleAuthorDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Budi Santoso',
  })
  displayName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example:
      'https://your-project.supabase.co/storage/v1/object/public/avatars/budi.png',
  })
  avatarUrl: string | null;
}

export class ArticleSummaryDto {
  @ApiProperty({
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  id: string;

  @ApiProperty({
    example: 'Panduan Arsitektur Microservices dengan NestJS',
  })
  title: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Memahami pola komunikasi antar layanan di lingkungan kampus.',
  })
  subtitle: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example:
      'https://your-project.supabase.co/storage/v1/object/public/article-images/covers/sample.png',
  })
  coverImageUrl: string | null;

  @ApiProperty({
    example: 'Paragraf pembuka artikel yang menjelaskan arsitektur layanan...',
  })
  excerpt: string;

  @ApiProperty({
    example: 3,
  })
  readingTimeMinutes: number;

  @ApiProperty({
    enum: ['draft', 'published'],
    example: 'draft',
  })
  status: 'draft' | 'published';

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'panduan-arsitektur-microservices-dengan-nestjs-a1b2c3d4',
  })
  slug: string | null;

  @ApiProperty({
    example: '2026-11-07T13:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    example: '2026-11-07T13:30:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
  })
  publishedAt: string | null;

  @ApiProperty({ type: () => ArticleAuthorDto })
  author: ArticleAuthorDto;
}

export class ArticleDto extends ArticleSummaryDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Paragraf pembuka artikel.' }],
        },
      ],
    },
  })
  content: Record<string, unknown>;
}

export class MyArticlesListDataDto {
  @ApiProperty({ type: () => [ArticleSummaryDto] })
  items: ArticleSummaryDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    example:
      'MjAyNi0xMS0wN1QxMzozMDowMC4wMDBafDdjOWU2Njc5LTc0MjUtNDBkZS05NDRiLWUwN2ZjMWY5MGFlNw==',
  })
  nextCursor: string | null;
}

export class CreateArticleResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 201 })
  declare statusCode: number;

  @ApiProperty({ example: 'Draft artikel berhasil dibuat' })
  declare message: string;

  @ApiProperty({ type: () => ArticleDto })
  data: ArticleDto;
}

export class ArticleDetailResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 200 })
  declare statusCode: number;

  @ApiProperty({ example: 'Artikel berhasil diambil' })
  declare message: string;

  @ApiProperty({ type: () => ArticleDto })
  data: ArticleDto;
}

export class UpdateArticleResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 200 })
  declare statusCode: number;

  @ApiProperty({ example: 'Artikel berhasil diperbarui' })
  declare message: string;

  @ApiProperty({ type: () => ArticleDto })
  data: ArticleDto;
}

export class PublishArticleResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 200 })
  declare statusCode: number;

  @ApiProperty({ example: 'Artikel berhasil dipublikasikan' })
  declare message: string;

  @ApiProperty({ type: () => ArticleDto })
  data: ArticleDto;
}

export class MyArticlesListResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 200 })
  declare statusCode: number;

  @ApiProperty({ example: 'Daftar artikel berhasil diambil' })
  declare message: string;

  @ApiProperty({ type: () => MyArticlesListDataDto })
  data: MyArticlesListDataDto;
}

