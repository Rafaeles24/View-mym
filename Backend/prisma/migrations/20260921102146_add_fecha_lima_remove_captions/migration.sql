-- DropForeignKey
ALTER TABLE `Venta` DROP FOREIGN KEY `Venta_campaign_id_fkey`;

-- DropForeignKey
ALTER TABLE `SedeCaption` DROP FOREIGN KEY `SedeCaption_sede_id_fkey`;

-- DropForeignKey
ALTER TABLE `SedeCaption` DROP FOREIGN KEY `SedeCaption_caption_id_fkey`;

-- DropIndex
DROP INDEX `Venta_campaign_id_sede_id_nombre_empleado_variante_empleado__idx` ON `Venta`;

-- AlterTable
ALTER TABLE `Venta` ADD COLUMN `fecha_lima` DATETIME(3) NULL;

-- DropTable
DROP TABLE `Caption`;

-- DropTable
DROP TABLE `SedeCaption`;

-- CreateIndex
CREATE INDEX `Venta_fecha_lima_idx` ON `Venta`(`fecha_lima`);

-- CreateIndex
CREATE INDEX `Venta_campaign_id_sede_id_nombre_empleado_variante_empleado__idx` ON `Venta`(`campaign_id`, `sede_id`, `nombre_empleado`, `variante_empleado`, `fecha`, `fecha_lima`);

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
