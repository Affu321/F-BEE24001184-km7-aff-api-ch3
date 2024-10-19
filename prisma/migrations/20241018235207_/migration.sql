/*
  Warnings:

  - A unique constraint covering the columns `[bank_account_number]` on the table `bank_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_bank_account_number_key" ON "bank_accounts"("bank_account_number");
