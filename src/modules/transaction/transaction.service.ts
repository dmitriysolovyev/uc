import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Transaction, TransactionType, TransactionStatus, TransactionAccountStatus } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../services/prisma/prisma.service';
import { TransferDto } from './transaction.dto';
import { AccountCreditEvent, AccountDebitEvent } from '../../events/account.event';

@Injectable()
export class TransactionService {
    constructor(
        private prisma: PrismaService,
        @Inject('RABBITMQ_SERVICE') private client: ClientProxy,
      ) {}

    // First step of transaction
    // Create state of transaction (Saga)
    // Send event to credit the account
    async transfer(data: TransferDto): Promise<Transaction> {
        if (data.accountIdFrom === data.accountIdTo) {
            throw new BadRequestException('Debit and credit accounts are the same');
        }

        const transaction = await this.prisma.transaction.create({
            data: {
                type: TransactionType.TransferMoney,
                amount: data.amount,
                accountIdFrom: data.accountIdFrom,
                accountFromStatus: TransactionAccountStatus.None,
                accountIdTo: data.accountIdTo,
                accountToStatus: TransactionAccountStatus.None,
            },
        });

        // event
        const creditEvent = new AccountCreditEvent(
            transaction.id,
            data.accountIdFrom,
            data.amount,
        );
        this.client.emit<number>(creditEvent.type, creditEvent);
        
        // update status
        await this.prisma.transaction.update({
            data: {
                status: TransactionStatus.Processing,
                accountFromStatus: TransactionAccountStatus.Processing,
            },
            where: {
                id: transaction.id,
            }
        });

        return transaction;
    }

    // Second step of transaction
    // Update state of transaction (Saga)
    // Send event to debit the account
    async transferTo(transactionId: string): Promise<void> {
        const transaction = await this.get(transactionId);

        const debitEvent = new AccountDebitEvent(
            transaction.id,
            transaction.accountIdTo,
            transaction.amount,
        );
        this.client.emit<number>(debitEvent.type, debitEvent);

        await this.prisma.transaction.update({
            data: {
                status: TransactionStatus.Processing,
                accountFromStatus: TransactionAccountStatus.Committed,
                accountToStatus: TransactionAccountStatus.Processing,
            },
            where: {
                id: transaction.id,
            }
        });
    }

    // The Final step of transaction
    // Update state of transaction (Saga)
    async transferFinal(transactionId: string, refund = false): Promise<void> {
        const transaction = await this.get(transactionId);

        if(!refund) {
            await this.prisma.transaction.update({
                data: {
                    status: TransactionStatus.Completed,
                    accountFromStatus: TransactionAccountStatus.Committed,
                    accountToStatus: TransactionAccountStatus.Committed,
                },
                where: {
                    id: transaction.id,
                }
            });
        } else {
            await this.prisma.transaction.update({
                data: {
                    status: TransactionStatus.Canceled,
                    accountFromStatus: TransactionAccountStatus.Canceled,
                },
                where: {
                    id: transaction.id,
                }
            });
        }
        
    }

    // Error on first step of transaction
    // Update state of transaction (Saga)
    async transferErrorFrom(transactionId: string, error: string): Promise<void> {
        const transaction = await this.get(transactionId);

        await this.prisma.transaction.update({
            data: {
                status: TransactionStatus.Canceled,
                accountFromStatus: TransactionAccountStatus.Canceled,
                accountToStatus: TransactionAccountStatus.None,
                error,
            },
            where: {
                id: transaction.id,
            }
        });
    }

    // Error on second step of transaction
    // Update state of transaction (Saga)
    // Send event to refund money
    async transferErrorTo(transactionId: string, error: string, refund = false): Promise<void> {
        const transaction = await this.get(transactionId);

        if(!refund) {
            // Refund money
            const debitEvent = new AccountDebitEvent(
                transaction.id,
                transaction.accountIdFrom,
                transaction.amount,
                true,
            );
            this.client.emit<number>(debitEvent.type, debitEvent);
            
            //
            await this.prisma.transaction.update({
                data: {
                    status: TransactionStatus.Canceling,
                    accountFromStatus: TransactionAccountStatus.Processing,
                    accountToStatus: TransactionAccountStatus.Canceled,
                    error,
                },
                where: {
                    id: transaction.id,
                }
            });
        } else {
            // Refund finished with error
            await this.prisma.transaction.update({
                data: {
                    status: TransactionStatus.Canceling,
                    accountFromStatus: TransactionAccountStatus.Processing,
                    accountToStatus: TransactionAccountStatus.Canceled,
                    error,
                },
                where: {
                    id: transaction.id,
                }
            });
            
            // TODO Alert! Try later
        }
        
    }

    async get(id: string): Promise<Transaction> {
        const transaction = await this.prisma.transaction.findUnique({
            where: {
              id,
            },
        });
      
        if(!transaction) {
            throw new NotFoundException(`Transaction ${id} is not found`);
        }

        return transaction;
    }
}
