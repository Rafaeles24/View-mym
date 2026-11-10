-- Give the site competition an independent date range.
CREATE TABLE `ConfigSedeVersus` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `modo` ENUM('DEFAULT', 'PERSONALIZADO') NOT NULL DEFAULT 'DEFAULT',
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_fin` DATETIME(3) NOT NULL,
    `zona_horaria` VARCHAR(191) NOT NULL DEFAULT 'America/Lima',
    `updateAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve the range currently shown by the site competition when available.
INSERT INTO `ConfigSedeVersus` (
    `id`,
    `modo`,
    `fecha_inicio`,
    `fecha_fin`,
    `zona_horaria`,
    `updateAt`
)
SELECT
    1,
    `modo`,
    `fecha_inicio`,
    `fecha_fin`,
    `zona_horaria`,
    CURRENT_TIMESTAMP(3)
FROM `ConfigVersus`
WHERE `id` = 1;
