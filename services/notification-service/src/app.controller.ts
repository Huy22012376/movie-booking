import { Controller } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
@Controller()
export class AppController {
  @EventPattern("payment.completed")
  handlePayment(@Payload() data: any) {
    console.log("==================================================");
    console.log("[NotificationService] GUI VE DIEN TU THANH CONG!");
    console.log("- Khach hang: " + data.userId + " | Ghe: " + data.seatCode + " | Ma don: " + data.bookingId);
    console.log("==================================================");
  }
}
