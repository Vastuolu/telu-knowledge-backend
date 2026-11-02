import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@supabase/supabase-js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import {
  ForgotPasswordResponseDto,
  LoginResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
  ResetPasswordResponseDto,
  ResendVerificationResponseDto,
} from './dto/auth-response.dto.js';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard.js';
import { GetUser } from './decorators/get-user.decorator.js';
import { GetToken } from './decorators/get-token.decorator.js';
import { BEARER_AUTH_NAME } from '../common/swagger/swagger.setup.js';
import {
  ApiErrorResponseDto,
  INTERNAL_SERVER_ERROR_EXAMPLE,
} from '../common/swagger/api-response.dto.js';
import { getAllowedEmailDomain } from './constants/auth.constants.js';

const EMAIL_DOMAIN_ERROR_EXAMPLE = {
  summary: 'Domain email tidak valid',
  value: {
    statusCode: 400,
    message: `Email harus menggunakan domain ${getAllowedEmailDomain()}`,
    isError: true,
    data: null,
  },
};

@ApiTags('Auth')
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
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Registrasi akun baru',
    description: `Mendaftar akun baru dengan email ${getAllowedEmailDomain()}. Tautan verifikasi akan dikirimkan ke email tersebut dan harus dikonfirmasi sebelum login.`,
  })
  @ApiCreatedResponse({
    description:
      'Registrasi berhasil diproses. User perlu memeriksa email untuk verifikasi akun.',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validasi body gagal',
    type: ApiErrorResponseDto,
    examples: {
      validation: {
        summary: 'Validasi body gagal',
        value: {
          statusCode: 400,
          message: [
            `Email harus menggunakan domain ${getAllowedEmailDomain()}`,
            'Password minimal 8 karakter',
          ],
          isError: true,
          data: null,
        },
      },
      emailDomain: EMAIL_DOMAIN_ERROR_EXAMPLE,
    },
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Kirim ulang email verifikasi',
    description:
      'Mengirim ulang tautan verifikasi ke email mahasiswa. Respons selalu seragam terlepas dari email sudah terdaftar/terverifikasi atau belum untuk mencegah enumerasi akun.',
  })
  @ApiOkResponse({
    description: 'Permintaan kirim ulang email verifikasi diproses',
    type: ResendVerificationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validasi body gagal atau bukan domain Telkom University',
    type: ApiErrorResponseDto,
    examples: {
      validation: {
        summary: 'Format email tidak valid',
        value: {
          statusCode: 400,
          message: ['email must be an email'],
          isError: true,
          data: null,
        },
      },
      emailDomain: EMAIL_DOMAIN_ERROR_EXAMPLE,
    },
  })
  resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendDto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Login',
    description:
      'Login dengan email & password. Gunakan `data.access_token` pada tombol Authorize untuk endpoint yang butuh autentikasi.',
  })
  @ApiOkResponse({
    description: 'Login berhasil',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validasi body gagal',
    type: ApiErrorResponseDto,
    examples: {
      validation: {
        summary: 'Validasi body gagal',
        value: {
          statusCode: 400,
          message: ['email must be an email', 'password should not be empty'],
          isError: true,
          data: null,
        },
      },
      emailDomain: EMAIL_DOMAIN_ERROR_EXAMPLE,
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Kredensial tidak valid atau email belum diverifikasi',
    type: ApiErrorResponseDto,
    examples: {
      invalidCredentials: {
        summary: 'Email atau password salah',
        value: {
          statusCode: 401,
          message: 'Email atau password salah',
          isError: true,
          data: null,
        },
      },
      unconfirmedEmail: {
        summary: 'Email belum diverifikasi',
        value: {
          statusCode: 401,
          message: 'Email belum diverifikasi. Silakan periksa email Anda.',
          isError: true,
          data: null,
        },
      },
    },
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Perbarui access token',
    description:
      'Menukar refresh_token yang masih valid dengan access_token dan refresh_token baru.',
  })
  @ApiOkResponse({
    description: 'Token berhasil diperbarui',
    type: RefreshResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Body request tidak valid',
    type: ApiErrorResponseDto,
    example: {
      statusCode: 400,
      message: ['refresh_token should not be empty'],
      isError: true,
      data: null,
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token tidak valid atau telah kedaluwarsa',
    type: ApiErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Refresh token tidak valid atau telah kedaluwarsa',
      isError: true,
      data: null,
    },
  })
  refresh(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refresh(refreshDto);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({
    summary: 'Logout',
    description: 'Mengakhiri dan menginvalidasi sesi login user saat ini.',
  })
  @ApiOkResponse({
    description: 'Logout berhasil',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak dikirim atau tidak valid',
    type: ApiErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Access token tidak ditemukan',
      isError: true,
      data: null,
    },
  })
  logout(@GetToken() token?: string) {
    return this.authService.logout(token);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Lupa password',
    description:
      'Mengirimkan tautan reset password ke email mahasiswa. Respons selalu seragam terlepas dari email terdaftar atau tidak untuk mencegah enumerasi akun.',
  })
  @ApiOkResponse({
    description: 'Permintaan reset password diproses',
    type: ForgotPasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Format email tidak valid atau bukan domain Telkom University',
    type: ApiErrorResponseDto,
    examples: {
      validation: {
        summary: 'Format email tidak valid',
        value: {
          statusCode: 400,
          message: ['email must be an email'],
          isError: true,
          data: null,
        },
      },
      emailDomain: EMAIL_DOMAIN_ERROR_EXAMPLE,
    },
  })
  forgotPassword(@Body() forgotDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotDto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Mengubah kata sandi user dengan menyertakan token pemulihan di header Authorization (Bearer <recovery_token>). Password baru minimal 8 karakter.',
  })
  @ApiOkResponse({
    description: 'Password berhasil diubah',
    type: ResetPasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Password baru tidak memenuhi syarat minimal 8 karakter',
    type: ApiErrorResponseDto,
    example: {
      statusCode: 400,
      message: ['Password minimal 8 karakter'],
      isError: true,
      data: null,
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token pemulihan tidak valid atau tidak dikirim',
    type: ApiErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Access token tidak valid',
      isError: true,
      data: null,
    },
  })
  resetPassword(
    @GetUser() user: User,
    @Body() resetDto: ResetPasswordDto,
    @GetToken() token?: string,
  ) {
    return this.authService.resetPassword(user.id, resetDto, token);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({
    summary: 'Data user yang sedang login',
    description:
      'Mengambil data user berdasarkan access token Supabase di header Authorization.',
  })
  @ApiOkResponse({
    description: 'Data user berhasil diambil',
    type: MeResponseDto,
  })
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
  getMe(@GetUser() user: User) {
    return this.authService.getMe(user);
  }
}
