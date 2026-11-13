import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { AppController } from "./app.controller";
@Module({
  imports: [
    PrometheusModule.register({ path: "/metrics" }),
    ClientsModule.register([{
      name: "KAFKA_SERVICE", transport: Transport.KAFKA,
      options: { client: { clientId: "payment-producer", brokers: ["kafka:9092"] } },
    }]),
  ],
  controllers: [AppController],
})
export class AppModule {}
