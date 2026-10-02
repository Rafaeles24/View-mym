-- AlterTable
ALTER TABLE `venta` ADD COLUMN `cerrador_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `Grupo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `Grupo_activo_idx`(`activo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cerrador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `nombre_normalizado` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `grupo_id` INTEGER NULL,

    UNIQUE INDEX `Cerrador_nombre_normalizado_key`(`nombre_normalizado`),
    INDEX `Cerrador_grupo_id_idx`(`grupo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cerrador` ADD CONSTRAINT `Cerrador_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `Grupo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_cerrador_id_fkey` FOREIGN KEY (`cerrador_id`) REFERENCES `Cerrador`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
