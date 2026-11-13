import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  seatCode: string;

  @Column({ type: 'varchar', default: 'AVAILABLE' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  lockedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null;
}
