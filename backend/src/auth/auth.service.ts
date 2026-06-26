import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface DevWechatLoginDto {
  mockOpenId?: string;
  nickname?: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async devWechatLogin(dto: DevWechatLoginDto) {
    const openId = String(dto.mockOpenId ?? '').trim();
    if (!openId) {
      throw new BadRequestException('mockOpenId is required');
    }

    const nickname = dto.nickname === undefined ? undefined : String(dto.nickname);
    const avatarUrl = dto.avatarUrl === undefined ? undefined : String(dto.avatarUrl);

    const user = await this.prisma.user.upsert({
      where: { wechatOpenId: openId },
      create: {
        wechatOpenId: openId,
        nickname: nickname || null,
        avatarUrl: avatarUrl || null,
      },
      update: {
        ...(nickname !== undefined ? { nickname } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
    });

    return {
      accessToken: this.signUser(user),
      user,
    };
  }

  private signUser(user: User) {
    return this.jwt.sign({
      sub: user.id,
      wechatOpenId: user.wechatOpenId,
    });
  }
}
