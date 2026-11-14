import { Injectable, OnModuleInit, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Seat } from './seat.entity';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
    private dataSource: DataSource,
  ) { }

  async onModuleInit() {
    const count = await this.seatRepo.count();
    if (count === 0) {
      const movies = ['m1', 'm2', 'm3', 'm4'];
      const initialSeats = movies.flatMap((movieId) =>
        Array.from({ length: 10 }, (_, i) => ({
          movieId,
          seatCode: `A${i + 1}`,
          status: 'AVAILABLE',
        })),
      );
      await this.seatRepo.save(initialSeats);
    }
  }

  async getAllSeats(movieId = 'm1') {
    let seats = await this.seatRepo.find({
      where: { movieId },
      order: { seatCode: 'ASC' },
    });
    if (seats.length === 0) {
      const newSeats = Array.from({ length: 10 }, (_, i) => ({
        movieId,
        seatCode: `A${i + 1}`,
        status: 'AVAILABLE',
      }));
      seats = await this.seatRepo.save(newSeats);
    }
    const now = Date.now();
    return seats.map((s) => ({
      ...s,
      remainingSeconds:
        s.status === 'LOCKED' && s.lockedUntil
          ? Math.max(0, Math.ceil((new Date(s.lockedUntil).getTime() - now) / 1000))
          : 0,
    }));
  }

  async lockSeat(seatCode: string, userId: string, movieId = 'm1') {
    return await this.dataSource.transaction(async (manager) => {
      const seat = await manager.findOne(Seat, {
        where: { seatCode, movieId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!seat) throw new NotFoundException('Không tìm thấy ghế');
      if (seat.status !== 'AVAILABLE') {
        throw new ConflictException(`Ghế ${seatCode} đang được giữ hoặc đã bán!`);
      }

      seat.status = 'LOCKED';
      seat.lockedBy = userId;
      seat.lockedUntil = new Date(Date.now() + 1 * 30 * 1000);
      return await manager.save(seat);
    });
  }

  async unlockSeat(seatCode: string, userId: string, movieId = 'm1') {
  const seat = await this.seatRepo.findOne({ where: { seatCode, movieId } });
    if (!seat) throw new NotFoundException('Không tìm thấy ghế');
    if (seat.status === 'LOCKED' && seat.lockedBy === userId) {
      await this.seatRepo.update(
        { id: seat.id },
        { status: 'AVAILABLE', lockedBy: null, lockedUntil: null },
      );
      return { ...seat, status: 'AVAILABLE', lockedBy: null, lockedUntil: null };
    }
    return seat;
  }


  @Cron(CronExpression.EVERY_SECOND)
  async releaseExpiredSeats() {
    const expiredSeats = await this.seatRepo.find({
      where: {
        status: 'LOCKED',
        lockedUntil: LessThan(new Date()),
      },
    });

    if (expiredSeats.length > 0) {
      for (const seat of expiredSeats) {
        seat.status = 'AVAILABLE';
        seat.lockedBy = null;
        seat.lockedUntil = null;
      }
      await this.seatRepo.save(expiredSeats);
      console.log(`[CronJob] Đã tự động mở khóa ${expiredSeats.length} ghế hết hạn.`);
    }
  }
}
