import { Controller, Post, Get, Body, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClientKafka } from "@nestjs/microservices";
import { Booking } from "./booking.entity";
@Controller("api/booking")
export class AppController {
  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @Inject("KAFKA_SERVICE") private readonly kafkaClient: ClientKafka,
  ) {}
  @Get() getAll() { return this.bookingRepo.find(); }
  @Post() async create(@Body() body: { seatCode: string; userId: string }) {
    const saved = await this.bookingRepo.save(this.bookingRepo.create({ seatCode: body.seatCode, userId: body.userId }));
    this.kafkaClient.emit("booking.created", { bookingId: saved.id, seatCode: saved.seatCode, userId: saved.userId });
    console.log("[BookingService] Da tao don " + saved.id + " va gui len Kafka!");
    return saved;
  }
}
