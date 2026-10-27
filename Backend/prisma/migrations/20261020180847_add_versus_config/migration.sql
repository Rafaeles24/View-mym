-- CreateTable
CREATE TABLE `ConfigVersus` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `modo` ENUM('DEFAULT', 'PERSONALIZADO') NOT NULL DEFAULT 'DEFAULT',
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_fin` DATETIME(3) NOT NULL,
    `intervalo_actualizacion` INTEGER NOT NULL DEFAULT 10,
    `ultima_actualizacion` DATETIME(3) NULL,
    `proxima_actualizacion` DATETIME(3) NULL,
    `hora_inicio_actualizacion` VARCHAR(5) NOT NULL DEFAULT '07:00',
    `hora_fin_actualizacion` VARCHAR(5) NOT NULL DEFAULT '16:00',
    `zona_horaria` VARCHAR(191) NOT NULL DEFAULT 'America/Lima',
    `updateAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
