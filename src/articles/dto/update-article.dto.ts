import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateArticleDto {
  @ApiPropertyOptional({
    description: 'Judul artikel (maksimal 150 karakter)',
    example: 'Panduan Arsitektur Microservices dengan NestJS (Revisi)',
    maxLength: 150,
  })
  @IsOptional()
  @IsString({ message: 'Judul artikel harus berupa teks' })
  @MaxLength(150, { message: 'Judul artikel maksimal 150 karakter' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Subjudul atau ringkasan singkat artikel (maksimal 300 karakter)',
    example: 'Memahami pola komunikasi antar layanan di lingkungan kampus.',
    maxLength: 300,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Subjudul artikel harus berupa teks' })
  @MaxLength(300, { message: 'Subjudul artikel maksimal 300 karakter' })
  subtitle?: string | null;

  @ApiPropertyOptional({
    description:
      'URL publik gambar sampul dari bucket Supabase Storage yang diizinkan',
    example:
      'https://your-project.supabase.co/storage/v1/object/public/article-images/covers/sample.png',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'URL gambar sampul harus berupa teks' })
  coverImageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Konten artikel dalam format JSON Tiptap ({ type: "doc", content: [...] })',
    type: 'object',
    additionalProperties: true,
    example: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Pendahuluan' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Isi artikel yang telah diperbarui.' }],
        },
      ],
    },
  })
  @IsOptional()
  @IsObject({ message: 'Konten artikel harus berupa objek JSON Tiptap' })
  content?: Record<string, unknown>;
}

