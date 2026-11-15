import { EventPattern, Payload } from "@nestjs/microservices";
import { Controller, Post, Get, Body, Inject, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { Booking } from './booking.entity';

@Controller('api/booking')
export class AppController {
  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  @Get()
  getAll() {
    return this.bookingRepo.find();
  }

  @Post()
  async create(@Body() body: { seatCode: string; userId: string; movieId?: string }) {
    const movieId = body.movieId || 'm1';
    const res = await fetch(`http://seat-locking:3003/api/seats?movieId=${movieId}`);
    const seats = await res.json();
    const seat = seats.find((s: any) => s.seatCode === body.seatCode);

    if (!seat || seat.status !== 'LOCKED' || seat.lockedBy !== body.userId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán ghế này!');
    }

    const saved = await this.bookingRepo.save(
      this.bookingRepo.create({ seatCode: body.seatCode, userId: body.userId }),
    );

    this.kafkaClient.emit('booking.created', {
      bookingId: saved.id,
      seatCode: saved.seatCode,
      userId: saved.userId,
      movieId,
    });
    return saved;
  }

  @EventPattern('payment.completed')
  async handlePaymentCompleted(@Payload() data: any) {
    const id = data?.bookingId || data?.id;
    if (id) {
      await this.bookingRepo.update({ id }, { status: 'CONFIRMED' }).catch(() => {});
    }
  }
}
