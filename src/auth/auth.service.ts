import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ResponseHelper } from '../common/helpers/response.helper.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  private readonly ALLOWED_DOMAIN = '@student.telkomuniversity.ac.id';

  constructor(private readonly supabaseService: SupabaseService) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    if (!email.endsWith(this.ALLOWED_DOMAIN)) {
      throw new BadRequestException(
        'Email harus menggunakan domain @student.telkomuniversity.ac.id',
      );
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return ResponseHelper.success(201, 'Registrasi berhasil', {
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
    });
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email.endsWith(this.ALLOWED_DOMAIN)) {
      throw new BadRequestException(
        'Email harus menggunakan domain @student.telkomuniversity.ac.id',
      );
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return ResponseHelper.success(200, 'Login berhasil', {
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

  async getMe(user: any) {
    return ResponseHelper.success(200, 'Data user berhasil diambil', {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  }
}
