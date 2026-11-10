import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
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
import {
  MAX_ARTICLE_IMAGE_SIZE_BYTES,
  UploadsService,
} from './uploads.service.js';
import {
  UploadArticleImageRequestDto,
  UploadArticleImageResponseDto,
} from './dto/upload-response.dto.js';

@ApiTags('Uploads')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth(BEARER_AUTH_NAME)
@ApiUnauthorizedResponse({
  description: 'Token tidak dikirim atau tidak valid',
  type: ApiErrorResponseDto,
  examples: {
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
  },
})
@ApiTooManyRequestsResponse({
  description: 'Terlalu banyak permintaan (rate limit 20/menit terlampaui)',
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
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('article-image')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_ARTICLE_IMAGE_SIZE_BYTES,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Unggah gambar untuk artikel',
    description:
      'Mengunggah file gambar artikel (field `file`, maksimal 4MB). Tipe file divalidasi berdasarkan magic bytes isi file (hanya PNG, JPEG, WEBP, atau GIF; header Content-Type dari client tidak dipercaya).',
  })
  @ApiBody({
    description: 'Form data berisi file gambar pada field `file`',
    type: UploadArticleImageRequestDto,
  })
  @ApiCreatedResponse({
    description: 'Gambar artikel berhasil diunggah',
    type: UploadArticleImageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'File tidak dikirim atau format isi file bukan gambar yang diizinkan',
    type: ApiErrorResponseDto,
    examples: {
      missingFile: {
        summary: 'File tidak dikirim',
        value: {
          statusCode: 400,
          message: 'File gambar wajib diunggah pada field "file"',
          isError: true,
          data: null,
        },
      },
      invalidFileType: {
        summary: 'Tipe isi file tidak didukung',
        value: {
          statusCode: 400,
          message:
            'Format file tidak didukung. Hanya gambar PNG, JPEG, WEBP, atau GIF yang diizinkan.',
          isError: true,
          data: null,
        },
      },
    },
  })
  @ApiPayloadTooLargeResponse({
    description: 'Ukuran file melebihi batas maksimal 4MB',
    type: ApiErrorResponseDto,
    example: {
      statusCode: 413,
      message: 'Ukuran file terlalu besar. Maksimal ukuran file adalah 4MB.',
      isError: true,
      data: null,
    },
  })
  uploadArticleImage(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.uploadsService.uploadArticleImage(user.id, file);
  }
}

