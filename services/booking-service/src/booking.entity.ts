import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  seatCode: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', default: 'PENDING' }) // PENDING | CONFIRMED
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
