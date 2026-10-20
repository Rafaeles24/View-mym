-- CreateTable
CREATE TABLE `versus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `cerrador_1_id` INTEGER NOT NULL,
    `cerrador_2_id` INTEGER NOT NULL,

    INDEX `versus_activo_idx`(`activo`),
    INDEX `versus_cerrador_1_id_idx`(`cerrador_1_id`),
    INDEX `versus_cerrador_2_id_idx`(`cerrador_2_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `versus` ADD CONSTRAINT `versus_cerrador_1_id_fkey` FOREIGN KEY (`cerrador_1_id`) REFERENCES `cerrador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `versus` ADD CONSTRAINT `versus_cerrador_2_id_fkey` FOREIGN KEY (`cerrador_2_id`) REFERENCES `cerrador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
