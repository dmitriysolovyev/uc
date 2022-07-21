-- Add  uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('Debit', 'Credit');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TransferMoney');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('Draft', 'Processing', 'Canceling', 'Canceled', 'Completed');

-- CreateEnum
CREATE TYPE "TransactionAccountStatus" AS ENUM ('None', 'Processing', 'Committed', 'Canceled');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "balance" INTEGER NOT NULL DEFAULT 0,
    "coefficient" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "account_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "operationType" "OperationType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "coefficient" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'Draft',
    "amount" REAL,
    "account_id_from" UUID NOT NULL,
    "account_from_status" "TransactionAccountStatus" NOT NULL DEFAULT 'None',
    "account_id_to" UUID NOT NULL,
    "account_to_status" "TransactionAccountStatus" NOT NULL DEFAULT 'None',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_history_transaction_id_operationType_key" ON "account_history"("transaction_id", "operationType");

-- AddForeignKey
ALTER TABLE "account_history" ADD CONSTRAINT "account_history_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_history" ADD CONSTRAINT "account_history_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_from_fkey" FOREIGN KEY ("account_id_from") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_to_fkey" FOREIGN KEY ("account_id_to") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
