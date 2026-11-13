import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Seat } from './seat.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrometheusModule.register({ path: '/metrics' }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'booking_db',
      entities: [Seat],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Seat]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
