import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@supabase/supabase-js';
import { AuthService } from './auth.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockSupabaseService: {
    createAuthClient: ReturnType<typeof vi.fn>;
    getAdminClient: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  let mockAuthClient: {
    auth: {
      signUp: ReturnType<typeof vi.fn>;
      signInWithPassword: ReturnType<typeof vi.fn>;
      refreshSession: ReturnType<typeof vi.fn>;
      resetPasswordForEmail: ReturnType<typeof vi.fn>;
      resend: ReturnType<typeof vi.fn>;
    };
  };

  let mockAdminClient: {
    auth: {
      admin: {
        signOut: ReturnType<typeof vi.fn>;
        updateUserById: ReturnType<typeof vi.fn>;
      };
    };
  };

  const VALID_EMAIL = 'mahasiswa@student.telkomuniversity.ac.id';
  const INVALID_DOMAIN_EMAIL = 'user@gmail.com';
  const VALID_PASSWORD = 'password123';

  beforeEach(async () => {
    mockAuthClient = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        refreshSession: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        resend: vi.fn(),
      },
    };

    mockAdminClient = {
      auth: {
        admin: {
          signOut: vi.fn().mockResolvedValue({ error: null }),
          updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    };

    mockSupabaseService = {
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
      getAdminClient: vi.fn().mockReturnValue(mockAdminClient),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'AUTH_EMAIL_REDIRECT_URL') {
          return 'http://localhost:3000/auth/callback';
        }
        if (key === 'AUTH_RESET_REDIRECT_URL') {
          return 'http://localhost:3000/reset-password';
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('harus berhasil registrasi jika email valid dan signUp Supabase sukses', async () => {
      mockAuthClient.auth.signUp.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-uuid-123',
            email: VALID_EMAIL,
            created_at: '2026-10-31T00:00:00Z',
          },
        },
        error: null,
      });

      const result = await authService.register({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
      });

      expect(result.statusCode).toBe(201);
      expect(result.isError).toBe(false);
      expect(result.data.user).toEqual({
        id: 'user-uuid-123',
        email: VALID_EMAIL,
        created_at: '2026-10-31T00:00:00Z',
      });
      expect(mockAuthClient.auth.signUp).toHaveBeenCalledWith({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
        },
      });
    });

    it('harus melempar BadRequestException jika domain email tidak diizinkan', async () => {
      await expect(
        authService.register({
          email: INVALID_DOMAIN_EMAIL,
          password: VALID_PASSWORD,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuthClient.auth.signUp).not.toHaveBeenCalled();
    });

    it('harus tetap mengembalikan 201 sukses jika email sudah terdaftar (cegah user enumeration)', async () => {
      mockAuthClient.auth.signUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'User already registered', status: 400 },
      });

      const result = await authService.register({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
      });

      expect(result.statusCode).toBe(201);
      expect(result.isError).toBe(false);
      expect(result.data.user).toBeNull();
    });

    it('harus melempar BadRequestException jika Supabase mengembalikan error selain user already exists', async () => {
      mockAuthClient.auth.signUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Database connection failed', status: 500 },
      });

      await expect(
        authService.register({
          email: VALID_EMAIL,
          password: VALID_PASSWORD,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('harus berhasil login jika kredensial benar dan email telah terkonfirmasi', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
          },
          user: {
            id: 'user-uuid-123',
            email: VALID_EMAIL,
            created_at: '2026-10-31T00:00:00Z',
          },
        },
        error: null,
      });

      const result = await authService.login({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
      });

      expect(result.statusCode).toBe(200);
      expect(result.isError).toBe(false);
      expect(result.data.access_token).toBe('mock-access-token');
      expect(result.data.refresh_token).toBe('mock-refresh-token');
      expect(result.data.user.id).toBe('user-uuid-123');
    });

    it('harus melempar BadRequestException jika domain email tidak diizinkan', async () => {
      await expect(
        authService.login({
          email: INVALID_DOMAIN_EMAIL,
          password: VALID_PASSWORD,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuthClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('harus melempar UnauthorizedException jika email belum diverifikasi (error code)', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: {
          message: 'Email not confirmed',
          code: 'email_not_confirmed',
        },
      });

      await expect(
        authService.login({
          email: VALID_EMAIL,
          password: VALID_PASSWORD,
        }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Email belum diverifikasi. Silakan periksa email Anda.',
        ),
      );
    });

    it('harus melempar UnauthorizedException jika tidak ada session pada data yang dikembalikan', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: null,
      });

      await expect(
        authService.login({
          email: VALID_EMAIL,
          password: VALID_PASSWORD,
        }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Email belum diverifikasi. Silakan periksa email Anda.',
        ),
      );
    });

    it('harus melempar UnauthorizedException jika password salah', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: {
          message: 'Invalid login credentials',
          code: 'invalid_credentials',
        },
      });

      await expect(
        authService.login({
          email: VALID_EMAIL,
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(new UnauthorizedException('Email atau password salah'));
    });
  });

  describe('refresh', () => {
    it('harus berhasil memperbarui access token jika refresh_token valid', async () => {
      mockAuthClient.auth.refreshSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
          },
          user: {
            id: 'user-uuid-123',
            email: VALID_EMAIL,
            created_at: '2026-10-31T00:00:00Z',
          },
        },
        error: null,
      });

      const result = await authService.refresh({
        refresh_token: 'valid-refresh-token',
      });

      expect(result.statusCode).toBe(200);
      expect(result.isError).toBe(false);
      expect(result.data.access_token).toBe('new-access-token');
      expect(result.data.refresh_token).toBe('new-refresh-token');
    });

    it('harus melempar UnauthorizedException jika refresh_token tidak valid atau kedaluwarsa', async () => {
      mockAuthClient.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid Refresh Token' },
      });

      await expect(
        authService.refresh({
          refresh_token: 'expired-or-invalid-token',
        }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Refresh token tidak valid atau telah kedaluwarsa',
        ),
      );
    });
  });

  describe('logout', () => {
    it('harus memanggil admin.signOut jika token disertakan', async () => {
      const result = await authService.logout('bearer-access-token');

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Logout berhasil');
      expect(mockAdminClient.auth.admin.signOut).toHaveBeenCalledWith(
        'bearer-access-token',
      );
    });

    it('harus berhasil logout meskipun token tidak disertakan', async () => {
      const result = await authService.logout(undefined);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Logout berhasil');
      expect(mockAdminClient.auth.admin.signOut).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('harus memanggil resetPasswordForEmail jika domain email valid', async () => {
      mockAuthClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const result = await authService.forgotPassword({
        email: VALID_EMAIL,
      });

      expect(result.statusCode).toBe(200);
      expect(result.isError).toBe(false);
      expect(mockAuthClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        VALID_EMAIL,
        {
          redirectTo: 'http://localhost:3000/reset-password',
        },
      );
    });

    it('harus melempar BadRequestException jika domain email tidak diizinkan', async () => {
      await expect(
        authService.forgotPassword({
          email: INVALID_DOMAIN_EMAIL,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuthClient.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('harus berhasil mengubah password dan melakukan admin signOut pada recovery token', async () => {
      mockAdminClient.auth.admin.updateUserById.mockResolvedValueOnce({
        data: { user: { id: 'user-uuid-123' } },
        error: null,
      });

      const result = await authService.resetPassword(
        'user-uuid-123',
        { password: 'newPassword123' },
        'recovery-bearer-token',
      );

      expect(result.statusCode).toBe(200);
      expect(result.isError).toBe(false);
      expect(result.message).toBe('Password berhasil diubah');
      expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        'user-uuid-123',
        { password: 'newPassword123' },
      );
      expect(mockAdminClient.auth.admin.signOut).toHaveBeenCalledWith(
        'recovery-bearer-token',
      );
    });

    it('harus melempar BadRequestException jika Supabase gagal mengupdate user', async () => {
      mockAdminClient.auth.admin.updateUserById.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found', status: 404 },
      });

      await expect(
        authService.resetPassword('invalid-user-id', {
          password: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    it('harus memanggil supabase.auth.resend jika email valid', async () => {
      mockAuthClient.auth.resend.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const result = await authService.resendVerification({
        email: VALID_EMAIL,
      });

      expect(result.statusCode).toBe(200);
      expect(result.isError).toBe(false);
      expect(mockAuthClient.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: VALID_EMAIL,
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
        },
      });
    });

    it('harus melempar BadRequestException jika domain email tidak diizinkan', async () => {
      await expect(
        authService.resendVerification({
          email: INVALID_DOMAIN_EMAIL,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuthClient.auth.resend).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('harus mengembalikan data user yang sedang login dengan format envelope', async () => {
      const mockUser = {
        id: 'user-uuid-123',
        email: VALID_EMAIL,
        created_at: '2026-10-31T00:00:00Z',
      } as unknown as User;

      const result = await authService.getMe(mockUser);

      expect(result.statusCode).toBe(200);
      expect(result.isError).toBe(false);
      expect(result.data.user).toEqual({
        id: 'user-uuid-123',
        email: VALID_EMAIL,
        created_at: '2026-10-31T00:00:00Z',
      });
    });
  });
});
