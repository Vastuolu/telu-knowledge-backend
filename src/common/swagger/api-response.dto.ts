import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Schema dokumentasi untuk envelope ResponseHelper.success()
export class ApiSuccessResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Berhasil' })
  message: string;

  @ApiProperty({ example: false })
  isError: boolean;
}

// Schema dokumentasi untuk error bawaan NestJS (HttpException / ValidationPipe)
export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Pesan error',
  })
  message: string | string[];

  @ApiPropertyOptional({ example: 'Bad Request' })
  error?: string;
}

export const INTERNAL_SERVER_ERROR_EXAMPLE = {
  statusCode: 500,
  message: 'Internal server error',
};
