-- Create the normalized participant table before removing the two fixed slots.
CREATE TABLE `VersusParticipante` (
    `versus_id` INTEGER NOT NULL,
    `cerrador_id` INTEGER NOT NULL,
    `equipo` INTEGER NOT NULL,
    `orden` INTEGER NOT NULL,

    UNIQUE INDEX `VersusParticipante_versus_id_equipo_orden_key`(`versus_id`, `equipo`, `orden`),
    INDEX `VersusParticipante_versus_id_equipo_idx`(`versus_id`, `equipo`),
    INDEX `VersusParticipante_cerrador_id_idx`(`cerrador_id`),
    PRIMARY KEY (`versus_id`, `cerrador_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve every existing 1 vs 1 assignment and its visual side.
INSERT INTO `VersusParticipante` (`versus_id`, `cerrador_id`, `equipo`, `orden`)
SELECT `id`, `cerrador_1_id`, 1, 1 FROM `Versus`
UNION ALL
SELECT `id`, `cerrador_2_id`, 2, 1 FROM `Versus`;

ALTER TABLE `VersusParticipante`
    ADD CONSTRAINT `VersusParticipante_versus_id_fkey`
        FOREIGN KEY (`versus_id`) REFERENCES `Versus`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `VersusParticipante_cerrador_id_fkey`
        FOREIGN KEY (`cerrador_id`) REFERENCES `Cerrador`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Versus`
    DROP FOREIGN KEY `Versus_cerrador_1_id_fkey`,
    DROP FOREIGN KEY `Versus_cerrador_2_id_fkey`;

DROP INDEX `Versus_cerrador_1_id_idx` ON `Versus`;
DROP INDEX `Versus_cerrador_2_id_idx` ON `Versus`;

ALTER TABLE `Versus`
    DROP COLUMN `cerrador_1_id`,
    DROP COLUMN `cerrador_2_id`;

CREATE INDEX `Venta_cerrador_id_tipo_empleado_fecha_tramitacion_idx`
    ON `Venta`(`cerrador_id`, `tipo_empleado`, `fecha_tramitacion`);
