/*
  Warnings:

  - Added the required column `identity_number` to the `profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `identity_type` to the `profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "identity_number" INTEGER NOT NULL,
ADD COLUMN     "identity_type" TEXT NOT NULL;
