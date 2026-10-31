import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import {
  LoginResponseDto,
  MeResponseDto,
  RegisterResponseDto,
} from './dto/auth-response.dto.js';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard.js';
import { GetUser } from './decorators/get-user.decorator.js';
import { BEARER_AUTH_NAME } from '../common/swagger/swagger.setup.js';
import {
  ApiErrorResponseDto,
  INTERNAL_SERVER_ERROR_EXAMPLE,
} from '../common/swagger/api-response.dto.js';

const EMAIL_DOMAIN_ERROR_EXAMPLE = {
  summary: 'Domain email tidak valid',
  value: {
    message: 'Email harus menggunakan domain @student.telkomuniversity.ac.id',
    error: 'Bad Request',
    statusCode: 400,
  },
};

@ApiTags('Auth')
@ApiInternalServerErrorResponse({
  description: 'Kesalahan tak terduga di server',
  type: ApiErrorResponseDto,
  example: INTERNAL_SERVER_ERROR_EXAMPLE,
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrasi akun baru',
    description:
      'Membuat akun Supabase baru (email langsung terkonfirmasi). Hanya menerima email @student.telkomuniversity.ac.id.',
  })
  @ApiCreatedResponse({
    description: 'Registrasi berhasil',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validasi body gagal atau ditolak oleh Supabase',
    type: ApiErrorResponseDto,
    examples: {
      validation: {
        summary: 'Validasi body gagal',
        value: {
          message: [
            'Email harus menggunakan domain @student.telkomuniversity.ac.id',
            'Password minimal 6 karakter',
          ],
          error: 'Bad Request',
          statusCode: 400,
        },
      },
      emailExists: {
        summary: 'Email sudah terdaftar (pesan dari Supabase)',
        value: {
          message: 'A user with this email address has already been registered',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    },
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description:
      'Login dengan email & password. Gunakan `data.access_token` pada tombol Authorize untuk endpoint yang butuh autentikasi. Catatan: status HTTP yang dikirim 201 (default @Post), sedangkan field `statusCode` di body bernilai 200.',
  })
  @ApiCreatedResponse({
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
          message: ['email must be an email', 'password should not be empty'],
          error: 'Bad Request',
          statusCode: 400,
        },
      },
      emailDomain: EMAIL_DOMAIN_ERROR_EXAMPLE,
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Email atau password salah',
    type: ApiErrorResponseDto,
    example: {
      message: 'Invalid login credentials',
      error: 'Unauthorized',
      statusCode: 401,
    },
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
          message: 'Access token tidak ditemukan',
          error: 'Unauthorized',
          statusCode: 401,
        },
      },
      invalidToken: {
        summary: 'Token tidak valid / kedaluwarsa',
        value: {
          message: 'Access token tidak valid',
          error: 'Unauthorized',
          statusCode: 401,
        },
      },
    },
  })
  getMe(@GetUser() user: any) {
    return this.authService.getMe(user);
  }
}
