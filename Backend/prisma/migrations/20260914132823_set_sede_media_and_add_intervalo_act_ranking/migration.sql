-- DropForeignKey
ALTER TABLE `AsignacionMedia`
DROP FOREIGN KEY `AsignacionMedia_campaign_id_fkey`;

-- DropIndex
DROP INDEX `AsignacionMedia_campaign_id_idx`
ON `AsignacionMedia`;

DROP INDEX `AsignacionMedia_campaign_id_prioridad_idx`
ON `AsignacionMedia`;

-- AlterTable
ALTER TABLE `AsignacionMedia`
    DROP PRIMARY KEY,
    DROP COLUMN `campaign_id`,
    ADD COLUMN `sede_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`sede_id`, `media_id`);

-- AlterTable
ALTER TABLE `ConfigRanking`
    ADD COLUMN `intervalo_actualizacion` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `proxima_actualizacion` DATETIME(3) NULL,
    ADD COLUMN `ultima_actualizacion` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `AsignacionMedia_sede_id_idx`
ON `AsignacionMedia`(`sede_id`);

CREATE INDEX `AsignacionMedia_sede_id_prioridad_idx`
ON `AsignacionMedia`(`sede_id`, `prioridad`);

-- AddForeignKey
ALTER TABLE `AsignacionMedia`
ADD CONSTRAINT `AsignacionMedia_sede_id_fkey`
FOREIGN KEY (`sede_id`)
REFERENCES `Sede`(`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;