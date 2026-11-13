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
  ) {}

  // Tự động tạo sẵn 10 ghế mẫu (A1 -> A10) khi khởi động
  async onModuleInit() {
    const count = await this.seatRepo.count();
    if (count === 0) {
      const initialSeats = Array.from({ length: 10 }, (_, i) => ({
        seatCode: `A${i + 1}`,
        status: 'AVAILABLE',
      }));
      await this.seatRepo.save(initialSeats);
    }
  }

  async getAllSeats() {
    return this.seatRepo.find({ order: { seatCode: 'ASC' } });
  }

  // CƠ CHẾ ĐỒNG BỘ HÓA (CHƯƠNG 6): Pessimistic Locking chống đặt trùng ghế
  async lockSeat(seatCode: string, userId: string) {
    return await this.dataSource.transaction(async (manager) => {
      // Khóa dòng dữ liệu ghế này lại (FOR UPDATE), buộc các luồng khác phải chờ
      const seat = await manager.findOne(Seat, {
        where: { seatCode },
        lock: { mode: 'pessimistic_write' },
      });

      if (!seat) throw new NotFoundException('Không tìm thấy ghế');
      if (seat.status !== 'AVAILABLE') {
        throw new ConflictException(`Ghế ${seatCode} đang được giữ hoặc đã bán!`);
      }

      seat.status = 'LOCKED';
      seat.lockedBy = userId;
      seat.lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // Giữ trong 5 phút
      return await manager.save(seat);
    });
  }

  // TIẾN TRÌNH CHẠY NGẦM (CHƯƠNG 3): Cron Job quét mỗi 30 giây để nhả ghế quá hạn
  @Cron(CronExpression.EVERY_30_SECONDS)
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
