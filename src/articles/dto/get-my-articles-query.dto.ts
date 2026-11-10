import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetMyArticlesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter status artikel milik sendiri',
    enum: ['draft', 'published'],
    example: 'draft',
  })
  @IsOptional()
  @IsIn(['draft', 'published'], {
    message: 'Status harus bernilai draft atau published',
  })
  status?: 'draft' | 'published';

  @ApiPropertyOptional({
    description: 'Jumlah maksimum artikel per halaman (1-50, default 20)',
    minimum: 1,
    maximum: 50,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit harus berupa bilangan bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  @Max(50, { message: 'Limit maksimal 50' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Cursor pagination dalam format base64 dari "updatedAt|id"',
    example:
      'MjAyNi0xMS0wN1QxMzozMDowMC4wMDBafDU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMA==',
  })
  @IsOptional()
  @IsString({ message: 'Cursor harus berupa teks' })
  cursor?: string;
}

