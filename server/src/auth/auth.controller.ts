import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService, DevWechatLoginDto } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('dev-wechat-login')
  devWechatLogin(@Body() body: DevWechatLoginDto) {
    return this.auth.devWechatLogin(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: unknown }) {
    return req.user;
  }
}
