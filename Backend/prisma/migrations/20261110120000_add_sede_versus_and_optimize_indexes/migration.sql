-- Add the operations manager relationship without affecting existing sites.
ALTER TABLE `Sede`
    ADD COLUMN `jefe_operaciones_id` INTEGER NULL;

CREATE UNIQUE INDEX `Sede_jefe_operaciones_id_key`
    ON `Sede`(`jefe_operaciones_id`);

ALTER TABLE `Sede`
    ADD CONSTRAINT `Sede_jefe_operaciones_id_fkey`
    FOREIGN KEY (`jefe_operaciones_id`)
    REFERENCES `Cerrador`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Speed up the exact-name lookups used by the SICA importer.
CREATE INDEX `Campaign_nombre_idx` ON `Campaign`(`nombre`);
CREATE INDEX `Sede_nombre_idx` ON `Sede`(`nombre`);

-- Replace broad or isolated Venta indexes with indexes matching visor queries.
DROP INDEX `Venta_fecha_idx` ON `Venta`;
DROP INDEX `Venta_fecha_lima_idx` ON `Venta`;
DROP INDEX `Venta_variante_empleado_idx` ON `Venta`;
DROP INDEX `Venta_nombre_empleado_idx` ON `Venta`;
DROP INDEX `Venta_campaign_id_sede_id_nombre_empleado_variante_empleado__idx` ON `Venta`;

CREATE INDEX `Venta_tipo_empleado_fecha_idx`
    ON `Venta`(`tipo_empleado`, `fecha`);

CREATE INDEX `Venta_sede_id_tipo_empleado_fecha_idx`
    ON `Venta`(`sede_id`, `tipo_empleado`, `fecha`);

CREATE INDEX `Venta_tipo_empleado_fecha_tramitacion_idx`
    ON `Venta`(`tipo_empleado`, `fecha_tramitacion`);

CREATE INDEX `Venta_cerrador_id_tipo_empleado_fecha_lima_idx`
    ON `Venta`(`cerrador_id`, `tipo_empleado`, `fecha_lima`);

-- The composite primary keys already cover these leading columns.
DROP INDEX `CampaignSede_campaign_id_idx` ON `CampaignSede`;
DROP INDEX `AsignacionMedia_sede_id_idx` ON `AsignacionMedia`;

-- Join rows should disappear together with their parent campaign or site.
ALTER TABLE `CampaignSede`
    DROP FOREIGN KEY `CampaignSede_campaign_id_fkey`,
    DROP FOREIGN KEY `CampaignSede_sede_id_fkey`;

ALTER TABLE `CampaignSede`
    ADD CONSTRAINT `CampaignSede_campaign_id_fkey`
        FOREIGN KEY (`campaign_id`)
        REFERENCES `Campaign`(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    ADD CONSTRAINT `CampaignSede_sede_id_fkey`
        FOREIGN KEY (`sede_id`)
        REFERENCES `Sede`(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
