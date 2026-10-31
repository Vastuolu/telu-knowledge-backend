import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import type { User } from '@supabase/supabase-js';
import { SupabaseService } from '../../supabase/supabase.service.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token tidak ditemukan');
    }

    const { data, error } = await this.supabaseService
      .createAuthClient()
      .auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Access token tidak valid');
    }

    request.user = data.user;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
