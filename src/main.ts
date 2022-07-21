import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { PrismaService } from './services/prisma/prisma.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  /*** {@link https://docs.nestjs.com/recipes/prisma#issues-with-enableshutdownhooks} */
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app)

  // Pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));
  
  // RabbitMQ
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBIT_MQ_URL],
      noAck: false,
      queue: 'accounts_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}
bootstrap();
