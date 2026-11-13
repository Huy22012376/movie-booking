import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { AppController } from "./app.controller";
import { Booking } from "./booking.entity";
@Module({
  imports: [
    PrometheusModule.register({ path: "/metrics" }),
    TypeOrmModule.forRoot({
      type: "postgres", host: "booking-db-primary", port: 5432,
      username: "postgres", password: "postgres", database: "booking_db",
      entities: [Booking], synchronize: true,
    }),
    TypeOrmModule.forFeature([Booking]),
    ClientsModule.register([{
      name: "KAFKA_SERVICE", transport: Transport.KAFKA,
      options: { client: { clientId: "booking-producer", brokers: ["kafka:9092"] } },
    }]),
  ],
  controllers: [AppController],
})
export class AppModule {}
