import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Transaction } from '@prisma/client';
import {
  EventPattern,
  Payload,
  Ctx,
  RmqContext,
} from '@nestjs/microservices';  
import { TransactionService } from './transaction.service';
import { TransferDto } from './transaction.dto';
import { Event } from '../../events/events.enum';
import {
    AccountCreditSuccessEvent,
    AccountDebitSuccessEvent,
    AccountCreditErrorEvent,
    AccountDebitErrorEvent,
} from '../../events/account.event';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Post('transfer')
  async transfer(@Body() data: TransferDto): Promise<Transaction> {
    return this.service.transfer(data);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<Transaction> {
    return this.service.get(id);
  }

  @EventPattern(Event.AccountCreditSuccess)
  async credit(@Payload() data: AccountCreditSuccessEvent, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    await this.service.transferTo(data.transactionId);
    channel.ack(originalMsg);
  }

  @EventPattern(Event.AccountDeditSuccess)
  async debit(@Payload() data: AccountDebitSuccessEvent, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    await this.service.transferFinal(data.transactionId, data.refund)
    channel.ack(originalMsg);
  }

  @EventPattern(Event.AccountCreditError)
  async creditError(@Payload() data: AccountCreditErrorEvent, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    await this.service.transferErrorFrom(data.transactionId, data.error);
    channel.ack(originalMsg);
  }
  
  @EventPattern(Event.AccountDeditError)
  async debitError(@Payload() data: AccountDebitErrorEvent, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    await this.service.transferErrorTo(data.transactionId, data.error, data.refund);
    channel.ack(originalMsg);
  }
}
