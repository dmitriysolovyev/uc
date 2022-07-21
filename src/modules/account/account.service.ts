import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Prisma, OperationType, PrismaClient, Account, AccountStatus } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../services/prisma/prisma.service';
import { AccountOperationDto, AccountCreateDto, AccountBalance } from './account.dto';
import { AccountCreditSuccessEvent, AccountDebitSuccessEvent } from '../../events/account.event';


@Injectable()
export class AccountService {
  private prismaClient: PrismaClient

  constructor(
    private prisma: PrismaService,
    @Inject('RABBITMQ_SERVICE') private client: ClientProxy,
  ) {
    this.prismaClient = new PrismaClient()
  }
  

  getRealAmount(amount: number, coefficient: number): number {
    return amount / coefficient;
  }

  getAccountAmount(amount: number, coefficient: number): number {
    return Math.trunc(amount * coefficient);
  }

  async create(data: AccountCreateDto): Promise<Account> {  
    return this.prisma.account.create({
      data
    });
  }
  
  async setInactive(accountId: string): Promise<Account> {  
    return this.prisma.account.update({
      data: {
        status: AccountStatus.Inactive,
      },
      where: {
        id: accountId,
      }
    });
  }

  async getBalance(accountId: string): Promise<AccountBalance> {
    const account = await this.prisma.account.findUnique({
      where: {
        id: accountId,
      },
    });

    if(!account) {
      throw new NotFoundException(`Account ${accountId} is not found`);
    }

    return {
      balance: this.getRealAmount(account.balance, account.coefficient)
    };
  }

  async credit(data: AccountOperationDto): Promise<void> {
    if (data.operationType !== OperationType.Credit) {
      throw new BadRequestException('Operation isn\'t Credit')
    }

    // one DB transaction
    await this.prismaClient.$transaction(async (prisma: Prisma.TransactionClient) => {
      const account = await prisma.account.findUnique({
        where: {
          id: data.accountId,
        },
      });
  
      if(!account) {
        throw new NotFoundException(`Account ${data.accountId} is not found`);
      }
      if(account.status !== AccountStatus.Active) {
        throw new BadRequestException(`Account ${data.accountId} is not Active`);
      }

      const updatedAccount = await prisma.account.update({
        data: {
          balance: {
            decrement: this.getAccountAmount(data.amount, account.coefficient),
          }
        },
        where: {
          id: data.accountId,
        },
      })

      if (updatedAccount.balance < 0) {
        throw new BadRequestException('Insufficient balance to complete the transaction')
      }

      await prisma.accountHistory.create({
        data: {
          operationType: data.operationType,
          amount: this.getAccountAmount(data.amount, account.coefficient),
          account: {
            connect: {
              id: data.accountId,
            },
          },
          transaction: {
            connect: {
              id: data.transactionId
            }
          },
        }
      });

      // event
      const event = new AccountCreditSuccessEvent(
        data.transactionId,
        data.accountId,
      );
      this.client.emit<number>(event.type, event);
    }) 
  }

  async debit(data: AccountOperationDto): Promise<void> {
    if (data.operationType !== OperationType.Debit) {
      throw new BadRequestException('Operation isn\'t Debit')
    }

    // one DB transaction
    await this.prismaClient.$transaction(async (prisma: Prisma.TransactionClient) => {
      const account = await prisma.account.findUnique({
        where: {
          id: data.accountId,
        },
      });
  
      if(!account) {
        throw new NotFoundException(`Account ${data.accountId} is not found`);
      }
      if(account.status !== AccountStatus.Active) {
        throw new BadRequestException(`Account ${data.accountId} is not Active`);
      }

      await prisma.account.update({
        data: {
          balance: {
            increment: this.getAccountAmount(data.amount, account.coefficient),
          }
        },
        where: {
          id: data.accountId,
        },
      })

      await prisma.accountHistory.create({
        data: {
          operationType: data.operationType,
          amount: this.getAccountAmount(data.amount, account.coefficient),
          account: {
            connect: {
              id: data.accountId,
            },
          },
          transaction: {
            connect: {
              id: data.transactionId
            }
          },
        }
      });

      // event
      const event = new AccountDebitSuccessEvent(
        data.transactionId,
        data.accountId,
        data.refund,
      );
      this.client.emit<number>(event.type, event);
    }) 
  }
}
