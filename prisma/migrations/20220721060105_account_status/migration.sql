-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('Active', 'Inactive');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'Active';
