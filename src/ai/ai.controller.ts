import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
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
import { AiService } from './ai.service.js';
import { AiAssistDto } from './dto/ai-assist.dto.js';
import { AiAssistResponseDto } from './dto/ai-response.dto.js';

@ApiTags('AI')
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
  description:
    'Rate limit terlampaui (maksimal 10 permintaan/menit per pengguna) atau layanan AI sedang sibuk',
  type: ApiErrorResponseDto,
  examples: {
    userRateLimit: {
      summary: 'Rate limit pengguna terlampaui',
      value: {
        statusCode: 429,
        message:
          'Batas penggunaan bantuan AI tercapai (maksimal 10 permintaan per menit)',
        isError: true,
        data: null,
      },
    },
    providerBusy: {
      summary: 'Provider AI sedang sibuk / kuota penuh',
      value: {
        statusCode: 429,
        message: 'Layanan AI sedang sibuk',
        isError: true,
        data: null,
      },
    },
  },
})
@ApiBadGatewayResponse({
  description: 'Kesalahan komunikasi atau timeout pada penyedia layanan AI',
  type: ApiErrorResponseDto,
  example: {
    statusCode: 502,
    message:
      'Gagal memproses permintaan bantuan AI. Silakan coba beberapa saat lagi.',
    isError: true,
    data: null,
  },
})
@ApiInternalServerErrorResponse({
  description: 'Kesalahan tak terduga di server',
  type: ApiErrorResponseDto,
  example: INTERNAL_SERVER_ERROR_EXAMPLE,
})
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('assist')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Bantuan penulisan AI (Telu)',
    description:
      'Mengolah teks terpilih menggunakan Google Gemini (parafrase, ringkas, kembangkan, perbaiki tata bahasa, ubah nada formal/santai, atau instruksi kustom). Dibatasi 10 permintaan/menit per pengguna dengan timeout 20 detik.',
  })
  @ApiOkResponse({
    description: 'Bantuan AI berhasil diproses',
    type: AiAssistResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validasi body gagal (mis. instruction kosong saat action custom)',
    type: ApiErrorResponseDto,
    examples: {
      missingCustomInstruction: {
        summary: 'Instruction kosong pada action custom',
        value: {
          statusCode: 400,
          message: ['Instruksi wajib diisi untuk aksi custom'],
          isError: true,
          data: null,
        },
      },
      invalidSelectedText: {
        summary: 'Panjang selectedText tidak valid',
        value: {
          statusCode: 400,
          message: ['Teks terpilih minimal 1 karakter'],
          isError: true,
          data: null,
        },
      },
    },
  })
  assist(@GetUser() user: User, @Body() dto: AiAssistDto) {
    return this.aiService.assist(user.id, dto);
  }
}

