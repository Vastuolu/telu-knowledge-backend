import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../common/swagger/api-response.dto.js';

// Schema dokumentasi response modul auth (tidak dipakai di business logic)

export class AuthUserDto {
  @ApiProperty({ example: '0b6f1c2e-6a3d-4f7b-9a51-2f1e8c7d9a10' })
  id: string;

  @ApiProperty({ example: 'mahasiswa@student.telkomuniversity.ac.id' })
  email: string;

  @ApiProperty({ example: '2026-10-31T12:00:00.000000Z' })
  created_at: string;
}

export class AuthUserDataDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class LoginDataDto extends AuthUserDataDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: 'v1.MRjVxkF8sZ2...' })
  refresh_token: string;

  @ApiProperty({ example: 3600, description: 'Masa berlaku token (detik)' })
  expires_in: number;
}

export class RegisterResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 201 })
  declare statusCode: number;

  @ApiProperty({
    example:
      'Registrasi berhasil. Silakan periksa email Anda untuk verifikasi akun.',
  })
  declare message: string;

  @ApiProperty({ type: AuthUserDataDto })
  data: AuthUserDataDto;
}

export class ResendVerificationResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({
    example:
      'Jika email terdaftar, tautan verifikasi telah dikirim ulang. Silakan periksa inbox atau spam email Anda.',
  })
  declare message: string;

  @ApiProperty({ type: () => Object, nullable: true, example: null })
  data: Record<string, never> | null;
}

export class LoginResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 'Login berhasil' })
  declare message: string;

  @ApiProperty({ type: LoginDataDto })
  data: LoginDataDto;
}

export class RefreshResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 'Token berhasil diperbarui' })
  declare message: string;

  @ApiProperty({ type: LoginDataDto })
  data: LoginDataDto;
}

export class LogoutResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 'Logout berhasil' })
  declare message: string;

  @ApiProperty({ type: () => Object, nullable: true, example: null })
  data: Record<string, never> | null;
}

export class ForgotPasswordResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({
    example:
      'Jika email terdaftar, tautan reset password telah dikirim ke email Anda.',
  })
  declare message: string;

  @ApiProperty({ type: () => Object, nullable: true, example: null })
  data: Record<string, never> | null;
}

export class ResetPasswordResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 'Password berhasil diubah' })
  declare message: string;

  @ApiProperty({ type: () => Object, nullable: true, example: null })
  data: Record<string, never> | null;
}

export class MeResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 'Data user berhasil diambil' })
  declare message: string;

  @ApiProperty({ type: AuthUserDataDto })
  data: AuthUserDataDto;
}
