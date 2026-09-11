/*
  Warnings:

  - You are about to drop the `asesor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `colaborador` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rankingdia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `supervisor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `asesor` DROP FOREIGN KEY `Asesor_supervisor_id_fkey`;

-- DropForeignKey
ALTER TABLE `campaign` DROP FOREIGN KEY `Campaign_asset_id_fkey`;

-- DropForeignKey
ALTER TABLE `colaborador` DROP FOREIGN KEY `Colaborador_campaign_id_fkey`;

-- DropForeignKey
ALTER TABLE `colaborador` DROP FOREIGN KEY `Colaborador_sede_id_fkey`;

-- DropForeignKey
ALTER TABLE `rankingdia` DROP FOREIGN KEY `RankingDia_colaborador_id_fkey`;

-- DropForeignKey
ALTER TABLE `supervisor` DROP FOREIGN KEY `Supervisor_campaign_id_fkey`;

-- DropForeignKey
ALTER TABLE `supervisor` DROP FOREIGN KEY `Supervisor_sede_id_fkey`;

-- DropIndex
DROP INDEX `Campaign_asset_id_fkey` ON `campaign`;

-- DropTable
DROP TABLE `asesor`;

-- DropTable
DROP TABLE `colaborador`;

-- DropTable
DROP TABLE `rankingdia`;

-- DropTable
DROP TABLE `supervisor`;

-- CreateTable
CREATE TABLE `Venta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_empleado` VARCHAR(191) NOT NULL,
    `variante_empleado` ENUM('OJT', 'ALTA', 'SUP') NOT NULL,
    `sede_id` INTEGER NULL,
    `campaign_id` INTEGER NULL,
    `fecha` DATETIME(3) NOT NULL,

    INDEX `Venta_campaign_id_idx`(`campaign_id`),
    INDEX `Venta_sede_id_idx`(`sede_id`),
    INDEX `Venta_fecha_idx`(`fecha`),
    INDEX `Venta_variante_empleado_idx`(`variante_empleado`),
    INDEX `Venta_nombre_empleado_idx`(`nombre_empleado`),
    INDEX `Venta_campaign_id_sede_id_nombre_empleado_variante_empleado__idx`(`campaign_id`, `sede_id`, `nombre_empleado`, `variante_empleado`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `Asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `Sede`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
