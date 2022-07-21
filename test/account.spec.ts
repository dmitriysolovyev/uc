import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AccountController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/POST account. Should create Account', async () => {
    const accountData = {
      balance: 1000,
      coefficient: 100,
    }

    const { body } = await request(app.getHttpServer())
      .post('/account')
      .send(accountData)
      .expect(201)

      expect(body).toMatchObject({
        status: 'Active',
        ...accountData,
      });
      expect(body.id).toBeTruthy();
  });

  it('/POST account/inactive. Should change Account status to Inactive', async () => {
    const accountData = {
      balance: 8888,
      coefficient: 100,
    }

    const { body } = await request(app.getHttpServer())
      .post('/account')
      .send(accountData)
      .expect(201)

    const { body: inactiveAccount } = await request(app.getHttpServer())
      .post(`/account/${body.id}/inactive`)
      .expect(201)

      expect(inactiveAccount).toMatchObject({
        status: 'Inactive',
        ...accountData,
      });
  });

  it('/GET account/:id/balance. Should return balance', async () => {
    const accountData = {
      balance: 3410,
      coefficient: 100,
    }

    const { body } = await request(app.getHttpServer())
      .post('/account')
      .send(accountData)
      .expect(201)

    const { body: balance } = await request(app.getHttpServer())
      .get(`/account/${body.id}/balance`)
      .expect(200);
    expect(balance).toMatchObject({
      balance: accountData.balance / accountData.coefficient,
    });
  });
});
