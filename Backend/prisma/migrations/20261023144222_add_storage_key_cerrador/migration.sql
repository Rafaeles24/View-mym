/*
  Warnings:

  - A unique constraint covering the columns `[storage_key]` on the table `Cerrador` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Cerrador` ADD COLUMN `storage_key` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Cerrador_storage_key_key` ON `Cerrador`(`storage_key`);
