import { Module } from '@nestjs/common';
import { AccountModule } from './modules/account/account.module';
import { TransactionModule } from './modules/transaction/transaction.module';

@Module({
  imports: [
    AccountModule,
    TransactionModule
  ],
})
export class AppModule {}
