/*
  Warnings:

  - You are about to drop the `asset` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `campaign` DROP FOREIGN KEY `Campaign_asset_id_fkey`;

-- DropIndex
DROP INDEX `Campaign_asset_id_fkey` ON `campaign`;

-- DropTable
DROP TABLE `asset`;
