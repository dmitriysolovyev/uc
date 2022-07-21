import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { Account, OperationType } from '@prisma/client';
import {
  EventPattern,
  Payload,
  Ctx,
  RmqContext,
  ClientProxy
} from '@nestjs/microservices';
import { AccountService } from './account.service';
import { AccountCreateDto, AccountBalance } from './account.dto';
import { Event } from '../../events/events.enum';
import {
  AccountCreditEvent,
  AccountCreditErrorEvent,
  AccountDebitEvent,
  AccountDebitErrorEvent,
} from '../../events/account.event';


@Controller('account')
export class AccountController {
  constructor(
    private readonly service: AccountService,
    @Inject('RABBITMQ_SERVICE') private client: ClientProxy,
  ) {}

  @Post()
  async create(@Body() data: AccountCreateDto): Promise<Account> {
    return await this.service.create(data);
  }

  @Post('/:id/inactive')
  async setInactive(@Param('id', new ParseUUIDPipe()) id: string): Promise<Account> {
    return await this.service.setInactive(id);
  }

  @Get(':id/balance')
  getBalance(@Param('id', new ParseUUIDPipe()) id: string): Promise<AccountBalance> {
    return this.service.getBalance(id);
  }

  @EventPattern(Event.AccountCredit)
  async credit(@Payload() data: AccountCreditEvent, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      await this.service.credit({
        transactionId: data.transactionId,
        accountId: data.accountId,
        operationType: OperationType.Credit,    
        amount: data.amount,
      });
    
    } catch(err) {
      // event
      const event = new AccountCreditErrorEvent(
        data.transactionId,
        data.accountId,
        data.amount,
        err.message,
      );
      this.client.emit<number>(event.type, event);
    
    } finally {
      channel.ack(originalMsg);
    }
  }

  @EventPattern(Event.AccountDedit)
  async debit(@Payload() data: AccountDebitEvent, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      await this.service.debit({
        transactionId: data.transactionId,
        accountId: data.accountId,
        operationType: OperationType.Debit,    
        amount: data.amount,
        refund: data.refund,
      })
    } catch(err) {
      // event
      const event = new AccountDebitErrorEvent(
        data.transactionId,
        data.accountId,
        data.amount,
        data.refund,
        err.message,
      );
      this.client.emit<number>(event.type, event);

    } finally {
      channel.ack(originalMsg);
    }
  }

}
