-- CreateTable
CREATE TABLE `ConfigRanking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo_empleado` ENUM('CERRADOR', 'AGENTE') NOT NULL,
    `periodo` ENUM('DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL') NOT NULL DEFAULT 'SEMANAL',
    `hora_inicio` INTEGER NOT NULL DEFAULT 0,
    `minuto_inicio` INTEGER NOT NULL DEFAULT 0,
    `dia_semana` INTEGER NOT NULL DEFAULT 1,
    `dia_mes` INTEGER NOT NULL DEFAULT 0,
    `mes_inicio` INTEGER NOT NULL DEFAULT 1,
    `zona_horaria` VARCHAR(191) NOT NULL DEFAULT 'America/Lima',
    `updateAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ConfigRanking_tipo_empleado_key`(`tipo_empleado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
