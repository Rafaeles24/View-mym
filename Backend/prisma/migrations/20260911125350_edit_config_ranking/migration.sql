/*
  Warnings:

  - You are about to drop the column `tipo_empleado` on the `configranking` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `ConfigRanking_tipo_empleado_key` ON `configranking`;

-- AlterTable
ALTER TABLE `configranking` DROP COLUMN `tipo_empleado`,
    ADD COLUMN `fecha_ancla` DATE NULL,
    ADD COLUMN `intervalo_dias` INTEGER NULL,
    MODIFY `id` INTEGER NOT NULL DEFAULT 1,
    MODIFY `periodo` ENUM('DIARIO', 'SEMANAL', 'PERSONALIZADO', 'MENSUAL', 'ANUAL') NOT NULL DEFAULT 'SEMANAL';
