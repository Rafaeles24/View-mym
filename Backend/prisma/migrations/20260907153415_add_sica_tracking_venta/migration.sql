/*
  Warnings:

  - A unique constraint covering the columns `[sica_id,campaign_id,tipo_empleado]` on the table `Venta` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sica_id` to the `Venta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo_empleado` to the `Venta` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `venta` ADD COLUMN `sica_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `tipo_empleado` ENUM('CERRADOR', 'AGENTE') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Venta_sica_id_campaign_id_tipo_empleado_key` ON `Venta`(`sica_id`, `campaign_id`, `tipo_empleado`);
