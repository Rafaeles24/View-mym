-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuario_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `hex` VARCHAR(191) NULL,
    `logo_url` VARCHAR(191) NULL,
    `storage_key` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Campaign_storage_key_key`(`storage_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sede` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `durationMs` INTEGER NULL DEFAULT 10000,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Caption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `text` LONGTEXT NOT NULL,
    `hex` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Caption_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Venta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sica_id` VARCHAR(191) NOT NULL,
    `nombre_empleado` VARCHAR(191) NOT NULL,
    `tipo_empleado` ENUM('CERRADOR', 'AGENTE') NOT NULL,
    `variante_empleado` ENUM('OJT', 'ALTA', 'SUP') NOT NULL,
    `sede_id` INTEGER NULL,
    `campaign_id` INTEGER NULL,
    `fecha` DATETIME(3) NOT NULL,

    INDEX `Venta_campaign_id_idx`(`campaign_id`),
    INDEX `Venta_sede_id_idx`(`sede_id`),
    INDEX `Venta_fecha_idx`(`fecha`),
    INDEX `Venta_variante_empleado_idx`(`variante_empleado`),
    INDEX `Venta_nombre_empleado_idx`(`nombre_empleado`),
    INDEX `Venta_campaign_id_sede_id_nombre_empleado_variante_empleado__idx`(`campaign_id`, `sede_id`, `nombre_empleado`, `variante_empleado`, `fecha`),
    UNIQUE INDEX `Venta_sica_id_campaign_id_tipo_empleado_key`(`sica_id`, `campaign_id`, `tipo_empleado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignSede` (
    `campaign_id` INTEGER NOT NULL,
    `sede_id` INTEGER NOT NULL,

    INDEX `CampaignSede_campaign_id_idx`(`campaign_id`),
    INDEX `CampaignSede_sede_id_idx`(`sede_id`),
    PRIMARY KEY (`campaign_id`, `sede_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AsignacionMedia` (
    `campaign_id` INTEGER NOT NULL,
    `media_id` INTEGER NOT NULL,
    `started_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,
    `prioridad` INTEGER NOT NULL DEFAULT 0,

    INDEX `AsignacionMedia_campaign_id_idx`(`campaign_id`),
    INDEX `AsignacionMedia_started_at_ended_at_idx`(`started_at`, `ended_at`),
    INDEX `AsignacionMedia_campaign_id_prioridad_idx`(`campaign_id`, `prioridad`),
    PRIMARY KEY (`campaign_id`, `media_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SedeCaption` (
    `sede_id` INTEGER NOT NULL,
    `caption_id` INTEGER NOT NULL,
    `started_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,

    INDEX `SedeCaption_sede_id_idx`(`sede_id`),
    INDEX `SedeCaption_started_at_ended_at_idx`(`started_at`, `ended_at`),
    PRIMARY KEY (`sede_id`, `caption_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConfigRanking` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `modo` ENUM('DEFAULT', 'PERSONALIZADO') NOT NULL DEFAULT 'DEFAULT',
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_fin` DATETIME(3) NOT NULL,
    `zona_horaria` VARCHAR(191) NOT NULL DEFAULT 'America/Lima',
    `updateAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `Sede`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignSede` ADD CONSTRAINT `CampaignSede_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `Campaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignSede` ADD CONSTRAINT `CampaignSede_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `Sede`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsignacionMedia` ADD CONSTRAINT `AsignacionMedia_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsignacionMedia` ADD CONSTRAINT `AsignacionMedia_media_id_fkey` FOREIGN KEY (`media_id`) REFERENCES `Media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SedeCaption` ADD CONSTRAINT `SedeCaption_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `Sede`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SedeCaption` ADD CONSTRAINT `SedeCaption_caption_id_fkey` FOREIGN KEY (`caption_id`) REFERENCES `Caption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
