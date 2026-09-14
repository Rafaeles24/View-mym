-- AlterTable
ALTER TABLE `Configranking` ADD COLUMN `hora_fin_actualizacion` VARCHAR(5) NOT NULL DEFAULT '16:00',
    ADD COLUMN `hora_inicio_actualizacion` VARCHAR(5) NOT NULL DEFAULT '07:00';
