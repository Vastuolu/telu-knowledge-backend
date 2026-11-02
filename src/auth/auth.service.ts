import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ResponseHelper } from '../common/helpers/response.helper.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import {
  getAllowedEmailDomain,
  isAllowedEmailDomain,
} from './constants/auth.constants.js';
import {
  isUserAlreadyExistsError,
  mapAuthError,
} from './helpers/auth-error.helper.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    if (!isAllowedEmailDomain(email)) {
      throw new BadRequestException(
        `Email harus menggunakan domain ${getAllowedEmailDomain()}`,
      );
    }

    const supabase = this.supabaseService.createAuthClient();
    const emailRedirectTo = this.configService.get<string>(
      'AUTH_EMAIL_REDIRECT_URL',
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    // Jika akun sudah terdaftar, kembalikan respons sukses yang identik
    // untuk mencegah enumerasi pengguna (user enumeration)
    if (error && !isUserAlreadyExistsError(error)) {
      throw new BadRequestException(mapAuthError(error));
    }

    return ResponseHelper.success(
      201,
      'Registrasi berhasil. Silakan periksa email Anda untuk verifikasi akun.',
      {
        user: data?.user
          ? {
              id: data.user.id,
              email: data.user.email ?? email,
              created_at: data.user.created_at,
            }
          : null,
      },
    );
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!isAllowedEmailDomain(email)) {
      throw new BadRequestException(
        `Email harus menggunakan domain ${getAllowedEmailDomain()}`,
      );
    }

    const supabase = this.supabaseService.createAuthClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const err = error as { message?: string; code?: string };
      const message = (err.message || '').toLowerCase();
      const code = (err.code || '').toLowerCase();

      if (
        code === 'email_not_confirmed' ||
        message.includes('email not confirmed')
      ) {
        throw new UnauthorizedException(
          'Email belum diverifikasi. Silakan periksa email Anda.',
        );
      }
      throw new UnauthorizedException('Email atau password salah');
    }

    if (!data.session) {
      throw new UnauthorizedException(
        'Email belum diverifikasi. Silakan periksa email Anda.',
      );
    }

    return ResponseHelper.success(200, 'Login berhasil', {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
        created_at: data.user.created_at,
      },
    });
  }

  async refresh(refreshDto: RefreshTokenDto) {
    const { refresh_token } = refreshDto;

    const supabase = this.supabaseService.createAuthClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau telah kedaluwarsa',
      );
    }

    return ResponseHelper.success(200, 'Token berhasil diperbarui', {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
    });
  }

  async logout(token?: string) {
    if (token) {
      const admin = this.supabaseService.getAdminClient();
      await admin.auth.admin.signOut(token);
    }

    return ResponseHelper.success(200, 'Logout berhasil', null);
  }

  async forgotPassword(forgotDto: ForgotPasswordDto) {
    const { email } = forgotDto;

    if (!isAllowedEmailDomain(email)) {
      throw new BadRequestException(
        `Email harus menggunakan domain ${getAllowedEmailDomain()}`,
      );
    }

    const supabase = this.supabaseService.createAuthClient();
    const redirectTo = this.configService.get<string>(
      'AUTH_RESET_REDIRECT_URL',
    );

    // Kirim email reset password.
    // Error sengaja tidak dibocorkan agar respons selalu sama (mencegah user enumeration)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    return ResponseHelper.success(
      200,
      'Jika email terdaftar, tautan reset password telah dikirim ke email Anda.',
      null,
    );
  }

  async resetPassword(
    userId: string,
    resetDto: ResetPasswordDto,
    token?: string,
  ) {
    const { password } = resetDto;

    const admin = this.supabaseService.getAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      throw new BadRequestException(mapAuthError(error));
    }

    if (token) {
      await admin.auth.admin.signOut(token);
    }

    return ResponseHelper.success(200, 'Password berhasil diubah', null);
  }

  async resendVerification(resendDto: ResendVerificationDto) {
    const { email } = resendDto;

    if (!isAllowedEmailDomain(email)) {
      throw new BadRequestException(
        `Email harus menggunakan domain ${getAllowedEmailDomain()}`,
      );
    }

    const supabase = this.supabaseService.createAuthClient();
    const emailRedirectTo = this.configService.get<string>(
      'AUTH_EMAIL_REDIRECT_URL',
    );

    await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo,
      },
    });

    return ResponseHelper.success(
      200,
      'Jika email terdaftar, tautan verifikasi telah dikirim ulang. Silakan periksa inbox atau spam email Anda.',
      null,
    );
  }

  async getMe(user: User) {
    return ResponseHelper.success(200, 'Data user berhasil diambil', {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  }
}
