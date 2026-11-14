import { Controller, Post, Get, Body, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Controller('api/auth')
export class AppController {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  @Get('users')
  getAllUsers() {
    return this.userRepo.find({ select: ['id', 'fullName', 'email', 'phone', 'gender', 'createdAt'] });
  }

  @Post('register')
  async register(@Body() body: { fullName: string; email: string; password: string; phone?: string; gender?: string; dob?: string }) {
    const exists = await this.userRepo.findOne({ where: { email: body.email } });
    if (exists) throw new BadRequestException('Email này đã được đăng ký!');
    const user = await this.userRepo.save(this.userRepo.create(body));
    console.log(`[UserService] Tài khoản mới đã đăng ký: ${user.fullName} (${user.email})`);
    return { id: user.id, fullName: user.fullName, email: user.email };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.userRepo.findOne({ where: { email: body.email } });
    if (!user || user.password !== body.password) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
    }
    console.log(`[UserService] Đăng nhập thành công: ${user.fullName}`);
    return { id: user.id, fullName: user.fullName, email: user.email };
  }
}
