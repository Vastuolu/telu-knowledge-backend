import { ApiProperty } from '@nestjs/swagger';

// Schema dokumentasi untuk envelope ResponseHelper.success()
export class ApiSuccessResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Berhasil' })
  message: string;

  @ApiProperty({ example: false })
  isError: boolean;
}

// Schema dokumentasi untuk error response yang konsisten via AllExceptionsFilter
export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Pesan error',
  })
  message: string | string[];

  @ApiProperty({ example: true })
  isError: boolean;

  @ApiProperty({ type: () => Object, nullable: true, example: null })
  data: Record<string, never> | null;
}

export const INTERNAL_SERVER_ERROR_EXAMPLE = {
  statusCode: 500,
  message: 'Internal server error',
  isError: true,
  data: null,
};
