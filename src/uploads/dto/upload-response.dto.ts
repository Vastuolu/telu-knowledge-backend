import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../common/swagger/api-response.dto.js';

export class UploadArticleImageRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description:
      'File gambar artikel (hanya PNG, JPEG, WEBP, atau GIF; maksimal 4MB)',
  })
  file: unknown;
}

export class UploadedArticleImageDataDto {
  @ApiProperty({
    description: 'Public URL gambar yang telah diunggah ke Supabase Storage',
    example:
      'https://your-project.supabase.co/storage/v1/object/public/article-images/550e8400-e29b-41d4-a716-446655440000/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.png',
  })
  url: string;

  @ApiProperty({
    description: 'Path objek di dalam bucket Supabase Storage (${userId}/${uuid}.${ext})',
    example:
      '550e8400-e29b-41d4-a716-446655440000/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.png',
  })
  path: string;
}

export class UploadArticleImageResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 201 })
  declare statusCode: number;

  @ApiProperty({ example: 'Gambar artikel berhasil diunggah' })
  declare message: string;

  @ApiProperty({ type: () => UploadedArticleImageDataDto })
  data: UploadedArticleImageDataDto;
}

