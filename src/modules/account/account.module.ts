import { Module } from '@nestjs/common';
import { Transport, ClientsModule } from '@nestjs/microservices';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { PrismaService } from "../../services/prisma/prisma.service";

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
  controllers: [AccountController],
  providers: [AccountService, PrismaService],
})
export class AccountModule {}
