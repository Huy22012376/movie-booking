import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Kết nối tới Apache Kafka để nhận/gửi sự kiện bất đồng bộ
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.SERVICE_NAME || 'catalog-service',
        brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
      },
      consumer: {
        groupId: `${process.env.SERVICE_NAME || 'catalog'}-consumer-group`,
      },
    },
  });

  await app.startAllMicroservices();
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Service is running on port ${port}`);
}
bootstrap();
