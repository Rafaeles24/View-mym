-- 1. Convertir la configuración por empleado en configuración global.
ALTER TABLE `ConfigRanking`
    DROP INDEX `ConfigRanking_tipo_empleado_key`,
    DROP COLUMN `tipo_empleado`,
    DROP COLUMN `periodo`,
    DROP COLUMN `hora_inicio`,
    DROP COLUMN `minuto_inicio`,
    DROP COLUMN `dia_semana`,
    DROP COLUMN `dia_mes`,
    DROP COLUMN `mes_inicio`,
    MODIFY COLUMN `id` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `modo`
        ENUM('DEFAULT', 'PERSONALIZADO')
        NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN `fecha_inicio` DATETIME(3) NULL,
    ADD COLUMN `fecha_fin` DATETIME(3) NULL;

-- 2. Calcular el rango DEFAULT en hora de Lima.
SET @ranking_hoy_lima =
    DATE(DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR));

-- WEEKDAY: lunes = 0 ... domingo = 6.
SET @ranking_dia_semana = WEEKDAY(@ranking_hoy_lima);

SET @ranking_lunes_lima =
    DATE_SUB(
        @ranking_hoy_lima,
        INTERVAL @ranking_dia_semana DAY
    );

-- Sábado o domingo: preparar la siguiente semana.
SET @ranking_lunes_lima =
    IF(
        @ranking_dia_semana >= 5,
        DATE_ADD(@ranking_lunes_lima, INTERVAL 7 DAY),
        @ranking_lunes_lima
    );

-- Guardar en UTC: lunes 00:00 Lima = lunes 05:00 UTC.
SET @ranking_inicio_utc =
    DATE_ADD(
        CAST(@ranking_lunes_lima AS DATETIME),
        INTERVAL 5 HOUR
    );

-- Fin exclusivo: sábado 00:00 Lima.
SET @ranking_fin_utc =
    DATE_ADD(@ranking_inicio_utc, INTERVAL 5 DAY);

-- 3. Consolidar en una única configuración global.
-- Se descartan las configuraciones anteriores por empleado.
DELETE FROM `ConfigRanking`
WHERE `id` <> 1;

UPDATE `ConfigRanking`
SET
    `modo` = 'DEFAULT',
    `fecha_inicio` = @ranking_inicio_utc,
    `fecha_fin` = @ranking_fin_utc,
    `zona_horaria` = 'America/Lima',
    `updateAt` = UTC_TIMESTAMP(3)
WHERE `id` = 1;

-- Crear el registro si la tabla estaba vacía o no tenía id = 1.
INSERT INTO `ConfigRanking` (
    `id`,
    `modo`,
    `fecha_inicio`,
    `fecha_fin`,
    `zona_horaria`,
    `updateAt`
)
SELECT
    1,
    'DEFAULT',
    @ranking_inicio_utc,
    @ranking_fin_utc,
    'America/Lima',
    UTC_TIMESTAMP(3)
WHERE NOT EXISTS (
    SELECT 1
    FROM `ConfigRanking`
    WHERE `id` = 1
);

-- 4. Hacer obligatorias las fechas una vez inicializadas.
ALTER TABLE `ConfigRanking`
    MODIFY COLUMN `fecha_inicio` DATETIME(3) NOT NULL,
    MODIFY COLUMN `fecha_fin` DATETIME(3) NOT NULL;