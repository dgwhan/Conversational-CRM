import {
  Injectable,
  Optional,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { StaffRoleSchema } from '../../../../contracts/iam.js';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { IS_PUBLIC_KEY } from '../../../../common/decorators/public.decorator.js';
import type { AuthUser } from '../../domain/types/auth-user.js';

type AuthenticatedRequest = Request & { user?: AuthUser };
type AccessTokenPayload = {
  sub?: unknown;
  tokenVersion?: unknown;
  role?: unknown;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Optional() private readonly reflector?: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Route gắn @Public() (health, login, webhook...) không cần Access Token
    const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Guard được đăng ký toàn cục và có route còn gắn @UseGuards(JwtAuthGuard): không xác thực lại 2 lần
    if (request.user?.id && (request as { authVerified?: boolean }).authVerified === true) {
      return true;
    }

    const match = /^Bearer\s+([^\s]+)$/i.exec(
      request.headers.authorization ?? '',
    );
    if (!match) throw new UnauthorizedException();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(match[1]);
    } catch {
      //sai chữ ký, token hết hạn hoặc không giải mã được
      throw new UnauthorizedException();
    }

    if (
      typeof payload.sub !== 'string' ||
      !Number.isInteger(payload.tokenVersion)
    ) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        status: true,
        tokenVersion: true,
      },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException();
    }

    const payloadRole = typeof payload.role === 'string' ? StaffRoleSchema.safeParse(payload.role) : null;
    request.user = { id: user.id, role: payloadRole?.success ? payloadRole.data : undefined };
    (request as { authVerified?: boolean }).authVerified = true;
    return true;
  }
}
