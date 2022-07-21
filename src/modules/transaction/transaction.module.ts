import { Module } from '@nestjs/common';
import { Transport, ClientsModule } from '@nestjs/microservices';
import { PrismaService } from "../../services/prisma/prisma.service";
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';

// This module manages and stores the state of distributed transactions.
// It implements the pattern Saga

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBIT_MQ_URL],
          noAck: false,
          queue: 'accounts_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  providers: [TransactionService, PrismaService],
  controllers: [TransactionController]
})
export class TransactionModule {}
