import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import * as request from 'supertest';
import {setTimeout} from "timers/promises";
import { TransactionType, TransactionStatus, TransactionAccountStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('TransactionController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
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
    await app.init();
  });

  it('/POST /transaction/transfer. Should transfer money from one account to another', async () => {
    // Account 1, Balance = 34.12
    const accountData1 = {
      balance: 3412,
      coefficient: 100,
    }
    // Account 2, Balance = 11.23
    const accountData2 = {
      balance: 1123,
      coefficient: 100,
    }
    const transferAmount = 4.13;

    // create account 1
    const { body: account1 } = await request(app.getHttpServer())
      .post('/account')
      .send(accountData1)
      .expect(201)

    const { body: balance1 } = await request(app.getHttpServer())
      .get(`/account/${account1.id}/balance`)
      .expect(200);
    expect(balance1).toMatchObject({
      balance: accountData1.balance / accountData1.coefficient,
    });

    // create account 2
    const { body: account2 } = await request(app.getHttpServer())
      .post('/account')
      .send(accountData2)
      .expect(201)

    const { body: balance2 } = await request(app.getHttpServer())
      .get(`/account/${account2.id}/balance`)
      .expect(200);
    expect(balance2).toMatchObject({
      balance: accountData2.balance / accountData2.coefficient,
    });

    // transfer
    const { body: transaction } = await request(app.getHttpServer())
      .post('/transaction/transfer')
      .send({
        amount: transferAmount,
        accountIdTo: account2.id,
        accountIdFrom: account1.id,
      })
      .expect(201)
    expect(transaction).toMatchObject({
      type: TransactionType.TransferMoney,
      amount: transferAmount,
      accountIdTo: account2.id,
      accountIdFrom: account1.id,
    });

    await setTimeout(500);

    // check result
    const { body: balance1_after } = await request(app.getHttpServer())
      .get(`/account/${account1.id}/balance`)
      .expect(200);
    expect(balance1_after).toMatchObject({
      balance: (accountData1.balance / accountData1.coefficient) - transferAmount,
    });

    const { body: balance2_after } = await request(app.getHttpServer())
      .get(`/account/${account2.id}/balance`)
      .expect(200);
    expect(balance2_after).toMatchObject({
      balance: (accountData2.balance / accountData2.coefficient) + transferAmount,
    });

    // check transaction
    const { body: resultTransaction } = await request(app.getHttpServer())
      .get(`/transaction/${transaction.id}`)
      .expect(200)
    expect(resultTransaction).toMatchObject({
      type: TransactionType.TransferMoney,
      status: TransactionStatus.Completed,
      accountFromStatus: TransactionAccountStatus.Committed,
      accountToStatus: TransactionAccountStatus.Committed,
    });
  });

  it('/POST /transaction/transfer. Shouldnt transfer money from one account to another. Insufficient funds', async () => {
    // Account 1, Balance = 4.00
    const accountData1 = {
      balance: 400,
      coefficient: 100,
    }
    // Account 2, Balance = 1000.00
    const accountData2 = {
      balance: 100000,
      coefficient: 100,
    }
    const transferAmount = 4.13; // it's more than account 1 balance 

    // create account 1
    const { body: account1 } = await request(app.getHttpServer())
      .post('/account')
      .send(accountData1)
      .expect(201)

    const { body: balance1 } = await request(app.getHttpServer())
      .get(`/account/${account1.id}/balance`)
      .expect(200);
    expect(balance1).toMatchObject({
      balance: accountData1.balance / accountData1.coefficient,
    });

    // create account 2
    const { body: account2 } = await request(app.getHttpServer())
      .post('/account')
      .send(accountData2)
      .expect(201)

    const { body: balance2 } = await request(app.getHttpServer())
      .get(`/account/${account2.id}/balance`)
      .expect(200);
    expect(balance2).toMatchObject({
      balance: accountData2.balance / accountData2.coefficient,
    });

    // transfer
    const { body: transaction } = await request(app.getHttpServer())
      .post('/transaction/transfer')
      .send({
        amount: transferAmount,
        accountIdTo: account2.id,
        accountIdFrom: account1.id,
      })
      .expect(201)
    expect(transaction).toMatchObject({
      type: TransactionType.TransferMoney,
      amount: transferAmount,
      accountIdTo: account2.id,
      accountIdFrom: account1.id,
    });

    await setTimeout(500);

    // check result
    const { body: balance1_after } = await request(app.getHttpServer())
      .get(`/account/${account1.id}/balance`)
      .expect(200);
    expect(balance1_after).toMatchObject({
      balance: (accountData1.balance / accountData1.coefficient), // have to be the same
    });

    const { body: balance2_after } = await request(app.getHttpServer())
      .get(`/account/${account2.id}/balance`)
      .expect(200);
    expect(balance2_after).toMatchObject({
      balance: (accountData2.balance / accountData2.coefficient),  // have to be the same
    });

    // check transaction
    const { body: resultTransaction } = await request(app.getHttpServer())
      .get(`/transaction/${transaction.id}`)
      .expect(200)
    expect(resultTransaction).toMatchObject({
      type: TransactionType.TransferMoney,
      status: TransactionStatus.Canceled,
      accountFromStatus: TransactionAccountStatus.Canceled,
      accountToStatus: TransactionAccountStatus.None,
      error: 'Insufficient balance to complete the transaction',
    });
  });

  it('/POST /transaction/transfer. Shouldnt transfer money from one account to another. Account 2 is Inactive', async () => {
    // Account 1, Balance = 50.00
    const accountData1 = {
      balance: 5000,
      coefficient: 100,
    }
    // Account 2, Balance = 1000.00
    const accountData2 = {
      balance: 100000,
      coefficient: 100,
    }
    const transferAmount = 10.00;

    // create account 1
    const { body: account1 } = await request(app.getHttpServer())
      .post('/account')
      .send(accountData1)
      .expect(201)

    const { body: balance1 } = await request(app.getHttpServer())
      .get(`/account/${account1.id}/balance`)
      .expect(200);
    expect(balance1).toMatchObject({
      balance: accountData1.balance / accountData1.coefficient,
    });

    // create account 2
    const { body: account2 } = await request(app.getHttpServer())
      .post('/account')
      .send(accountData2)
      .expect(201)

    const { body: balance2 } = await request(app.getHttpServer())
      .get(`/account/${account2.id}/balance`)
      .expect(200);
    expect(balance2).toMatchObject({
      balance: accountData2.balance / accountData2.coefficient,
    });

    // set account 2 as Inactive
    const { body: inactiveAccount } = await request(app.getHttpServer())
      .post(`/account/${account2.id}/inactive`)
      .expect(201)

    expect(inactiveAccount).toMatchObject({
      status: 'Inactive',
    });

    // transfer
    const { body: transaction } = await request(app.getHttpServer())
      .post('/transaction/transfer')
      .send({
        amount: transferAmount,
        accountIdTo: account2.id,
        accountIdFrom: account1.id,
      })
      .expect(201)
    expect(transaction).toMatchObject({
      type: TransactionType.TransferMoney,
      amount: transferAmount,
      accountIdTo: account2.id,
      accountIdFrom: account1.id,
    });

    await setTimeout(500);

    // check result
    const { body: balance1_after } = await request(app.getHttpServer())
      .get(`/account/${account1.id}/balance`)
      .expect(200);
    expect(balance1_after).toMatchObject({
      balance: (accountData1.balance / accountData1.coefficient), // have to be the same
    });

    const { body: balance2_after } = await request(app.getHttpServer())
      .get(`/account/${account2.id}/balance`)
      .expect(200);
    expect(balance2_after).toMatchObject({
      balance: (accountData2.balance / accountData2.coefficient),  // have to be the same
    });

    // check transaction
    const { body: resultTransaction } = await request(app.getHttpServer())
      .get(`/transaction/${transaction.id}`)
      .expect(200)
    expect(resultTransaction).toMatchObject({
      type: TransactionType.TransferMoney,
      status: TransactionStatus.Canceled,
      accountFromStatus: TransactionAccountStatus.Canceled,
      accountToStatus: TransactionAccountStatus.Canceled,
    });
    expect(resultTransaction.error).toMatch('is not Active')
  });
});
