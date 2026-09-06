import { Body, Controller, Get, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService, DevWechatLoginDto } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('dev-wechat-login')
  devWechatLogin(@Body() body: DevWechatLoginDto) {
    // 开发用 mock 登录：生产环境必须禁用，否则任何人都能伪造任意身份登录
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    return this.auth.devWechatLogin(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: unknown }) {
    return req.user;
  }
}
