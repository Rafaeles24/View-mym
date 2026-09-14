/*
  Warnings:

  - The primary key for the `asignacionmedia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `campaign_id` on the `asignacionmedia` table. All the data in the column will be lost.
  - Added the required column `sede_id` to the `AsignacionMedia` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `asignacionmedia` DROP FOREIGN KEY `AsignacionMedia_campaign_id_fkey`;

-- DropIndex
DROP INDEX `AsignacionMedia_campaign_id_idx` ON `asignacionmedia`;

-- DropIndex
DROP INDEX `AsignacionMedia_campaign_id_prioridad_idx` ON `asignacionmedia`;

-- AlterTable
ALTER TABLE `asignacionmedia` DROP PRIMARY KEY,
    DROP COLUMN `campaign_id`,
    ADD COLUMN `sede_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`sede_id`, `media_id`);

-- AlterTable
ALTER TABLE `configranking` ADD COLUMN `intervalo_actualizacion` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `proxima_actualizacion` DATETIME(3) NULL,
    ADD COLUMN `ultima_actualizacion` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `AsignacionMedia_sede_id_idx` ON `AsignacionMedia`(`sede_id`);

-- CreateIndex
CREATE INDEX `AsignacionMedia_sede_id_prioridad_idx` ON `AsignacionMedia`(`sede_id`, `prioridad`);

-- AddForeignKey
ALTER TABLE `AsignacionMedia` ADD CONSTRAINT `AsignacionMedia_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `Sede`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
