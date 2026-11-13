import { Controller, Inject } from "@nestjs/common";
import { EventPattern, Payload, ClientKafka } from "@nestjs/microservices";
@Controller()
export class AppController {
  constructor(@Inject("KAFKA_SERVICE") private readonly kafkaClient: ClientKafka) {}
  @EventPattern("booking.created")
  handleBooking(@Payload() data: any) {
    console.log("[PaymentService] Dang thanh toan cho don: " + data.bookingId + " (Ghe " + data.seatCode + ")");
    this.kafkaClient.emit("payment.completed", { ...data, paidAt: new Date().toISOString() });
    console.log("[PaymentService] Thanh toan xong! Da gui su kien payment.completed.");
  }
}
