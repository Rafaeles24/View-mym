CREATE TABLE `VersusEquipo` (
    `versus_id` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`versus_id`, `numero`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `VersusEquipo`
    ADD CONSTRAINT `VersusEquipo_versus_id_fkey`
        FOREIGN KEY (`versus_id`) REFERENCES `Versus`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `VersusEquipo` (`versus_id`, `numero`, `nombre`)
SELECT `versus_id`, `equipo`, CONCAT('Equipo ', `equipo`)
FROM `VersusParticipante`
GROUP BY `versus_id`, `equipo`;
