import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthUser {
  id: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);

@Injectable()
export class AuthService {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private jwtSecret: Uint8Array | null = null;

  constructor(private readonly config: ConfigService) {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    if (supabaseUrl) {
      this.jwks = createRemoteJWKSet(
        new URL(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`),
      );
    }

    const jwtSecret = this.config.get<string>('SUPABASE_JWT_SECRET');
    if (jwtSecret) {
      this.jwtSecret = new TextEncoder().encode(jwtSecret);
    }
  }

  async verifyToken(token: string): Promise<AuthUser> {
    const devBypass = this.config.get<string>('AUTH_DEV_BYPASS');
    if (devBypass === 'true') {
      const devUserId = this.config.get<string>('AUTH_DEV_USER_ID');
      const devUserEmail = this.config.get<string>('AUTH_DEV_USER_EMAIL', 'dev@localhost');
      if (!devUserId) {
        throw new UnauthorizedException('AUTH_DEV_USER_ID is required when AUTH_DEV_BYPASS=true');
      }
      return { id: devUserId, email: devUserEmail };
    }

    try {
      const payload = await this.verifyWithConfiguredMethod(token);
      const id = typeof payload.sub === 'string' ? payload.sub : null;
      const email =
        typeof payload.email === 'string'
          ? payload.email
          : typeof payload.user_metadata === 'object' &&
              payload.user_metadata !== null &&
              typeof (payload.user_metadata as { email?: unknown }).email === 'string'
            ? (payload.user_metadata as { email: string }).email
            : null;

      if (!id || !email) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return { id, email };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async verifyWithConfiguredMethod(token: string) {
    if (this.jwks) {
      const { payload } = await jwtVerify(token, this.jwks);
      return payload;
    }

    if (this.jwtSecret) {
      const { payload } = await jwtVerify(token, this.jwtSecret);
      return payload;
    }

    throw new UnauthorizedException(
      'Auth is not configured. Set SUPABASE_URL or SUPABASE_JWT_SECRET.',
    );
  }
}
