const { Pool } = require("pg");
const payPool = new Pool({ host: process.env.DB_HOST || "payment-db-primary", user: "postgres", password: "postgres", database: process.env.DB_NAME || "payment_db" });
import { Controller, Inject } from "@nestjs/common";
import { EventPattern, Payload, ClientKafka } from "@nestjs/microservices";
@Controller()
export class AppController {
  constructor(@Inject("KAFKA_SERVICE") private readonly kafkaClient: ClientKafka) {}
  @EventPattern("booking.created")
  async handleBooking(@Payload() data: any) {
    console.log("[PaymentService] Dang thanh toan cho don: " + data.bookingId + " (Ghe " + data.seatCode + ")");
    const cinemaName = (data.movieId || "Cine").split("_")[0];
    const userName = data.userId || "Khách";
    const seatCode = data.seatCode || "A1";
    const recent = await payPool.query("SELECT id, seats, amount FROM payments WHERE user_id=$1 AND cinema=$2 AND created_at > NOW() - INTERVAL '4 seconds' ORDER BY created_at DESC LIMIT 1", [userName, cinemaName]).catch(() => ({ rows: [] }));
    if (recent.rows.length > 0) {
      const row = recent.rows[0];
      await payPool.query("UPDATE payments SET seats=$1, amount=$2 WHERE id=$3", [`${row.seats}, ${seatCode}`, Number(row.amount) + 90000, row.id]).catch(() => {});
    } else {
      await payPool.query("INSERT INTO payments (user_id, cinema, seats, amount, method, status) VALUES ($1, $2, $3, $4, $5, $6)", [userName, cinemaName, seatCode, 90000, "VIETQR_MB", "COMPLETED"]).catch(() => {});
    }
    this.kafkaClient.emit("payment.completed", { ...data, paidAt: new Date().toISOString() });
    console.log("[PaymentService] Thanh toan xong! Da gui su kien payment.completed.");
  }
}
