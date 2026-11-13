import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppService } from './app.service';
import { Seat } from './seat.entity';

@Controller('api/seats')
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
  ) { }

  @Get()
  getSeats(@Query('movieId') movieId?: string) {
    return this.appService.getAllSeats(movieId || 'm1');
  }

  @Post('lock')
  lockSeat(@Body() body: { seatCode: string; userId: string; movieId?: string }) {
    return this.appService.lockSeat(body.seatCode, body.userId, body.movieId || 'm1');
  }

  @Post('unlock')
  unlockSeat(@Body() body: { seatCode: string; userId: string; movieId?: string }) {
    return this.appService.unlockSeat(body.seatCode, body.userId, body.movieId || 'm1');
  }


  @EventPattern('payment.completed')
  async confirmSeat(@Payload() data: any) {
    const movieId = data.movieId || 'm1';
    const seat = await this.seatRepo.findOne({
      where: { seatCode: data.seatCode, movieId },
    });
    if (seat) {
      seat.status = 'BOOKED';
      seat.lockedUntil = null;
      await this.seatRepo.save(seat);
      console.log(`[SeatLocking] Ghế ${data.seatCode} (Phim ${movieId}) đã chuyển sang BOOKED!`);
    }
  }

}
