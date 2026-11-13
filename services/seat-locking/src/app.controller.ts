import { Controller, Get, Post, Body } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppService } from "./app.service";
import { Seat } from "./seat.entity";
@Controller("api/seats")
export class AppController {
  constructor(private readonly appService: AppService, @InjectRepository(Seat) private seatRepo: Repository<Seat>) {}
  @Get() getSeats() { return this.appService.getAllSeats(); }
  @Post("lock") lockSeat(@Body() body: { seatCode: string; userId: string }) { return this.appService.lockSeat(body.seatCode, body.userId); }
  @EventPattern("payment.completed")
  async confirmSeat(@Payload() data: any) {
    const seat = await this.seatRepo.findOne({ where: { seatCode: data.seatCode } });
    if (seat) {
      seat.status = "BOOKED"; seat.lockedUntil = null;
      await this.seatRepo.save(seat);
      console.log("[SeatLocking] Ghe " + data.seatCode + " da chinh thuc chuyen sang BOOKED!");
    }
  }
}
