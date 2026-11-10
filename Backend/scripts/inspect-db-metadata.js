require('dotenv').config();

const mariadb = require('mariadb');

async function inspectDatabase() {
  let connection;

  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);

    connection = await mariadb.createConnection({
      host: databaseUrl.hostname,
      port: Number(databaseUrl.port || 3306),
      user: decodeURIComponent(databaseUrl.username),
      password: decodeURIComponent(databaseUrl.password),
      database: databaseUrl.pathname.replace(/^\//, ''),
    });

    const [settings] = await connection.query(
      'SELECT @@lower_case_table_names AS lower_case_table_names, DATABASE() AS db',
    );
    const tables = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME',
    );
    const hasMigrationTable = tables.some(
      ({ TABLE_NAME }) => TABLE_NAME.toLowerCase() === '_prisma_migrations',
    );
    const migrations = hasMigrationTable
      ? await connection.query(
          'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at',
        )
      : [];
    const [salesSummary] = await connection.query(
      `SELECT
         COUNT(*) AS total,
         SUM(fecha_lima IS NULL) AS sin_fecha_lima,
         SUM(fecha_tramitacion IS NULL) AS sin_fecha_tramitacion,
         MIN(fecha) AS primera_fecha,
         MAX(fecha) AS ultima_fecha,
         MIN(fecha_lima) AS primera_fecha_lima,
         MAX(fecha_lima) AS ultima_fecha_lima,
         MIN(fecha_tramitacion) AS primera_fecha_tramitacion,
         MAX(fecha_tramitacion) AS ultima_fecha_tramitacion
       FROM Venta`,
    );
    const salesByType = await connection.query(
      `SELECT tipo_empleado, COUNT(*) AS cantidad
       FROM Venta
       GROUP BY tipo_empleado
       ORDER BY tipo_empleado`,
    );
    const recentSales = await connection.query(
      `SELECT
         DATE(fecha) AS dia_fecha,
         DATE(fecha_lima) AS dia_fecha_lima,
         DATE(fecha_tramitacion) AS dia_tramitacion,
         tipo_empleado,
         COUNT(*) AS cantidad
       FROM Venta
       GROUP BY
         DATE(fecha),
         DATE(fecha_lima),
         DATE(fecha_tramitacion),
         tipo_empleado
       ORDER BY MAX(fecha) DESC
       LIMIT 20`,
    );
    const [rangeCounts] = await connection.query(
      `SELECT
         cr.fecha_inicio AS ranking_inicio,
         cr.fecha_fin AS ranking_fin,
         cv.fecha_inicio AS versus_inicio,
         cv.fecha_fin AS versus_fin,
         SUM(v.tipo_empleado = 'AGENTE'
             AND v.fecha >= cr.fecha_inicio
             AND v.fecha <= cr.fecha_fin) AS ranking_agentes,
         SUM(v.tipo_empleado = 'CERRADOR'
             AND v.fecha >= cr.fecha_inicio
             AND v.fecha <= cr.fecha_fin) AS ranking_cerradores,
         SUM(v.tipo_empleado = 'CERRADOR'
             AND v.fecha_lima >= cv.fecha_inicio
             AND v.fecha_lima <= cv.fecha_fin) AS versus_cerradores,
         SUM(v.tipo_empleado = 'AGENTE'
             AND v.fecha_lima >= cv.fecha_inicio
             AND v.fecha_lima <= cv.fecha_fin) AS versus_sedes
       FROM Venta v
       CROSS JOIN ConfigRanking cr
       CROSS JOIN ConfigVersus cv
       WHERE cr.id = 1 AND cv.id = 1`,
    );

    console.log(
      JSON.stringify(
        {
          settings: {
            database: settings.db,
            lower_case_table_names: Number(settings.lower_case_table_names),
          },
          tables: tables.map(({ TABLE_NAME }) => TABLE_NAME),
          migrations: migrations.map((migration) => ({
            name: migration.migration_name,
            finished: Boolean(migration.finished_at),
            rolledBack: Boolean(migration.rolled_back_at),
          })),
          sales: {
            summary: salesSummary,
            byType: salesByType,
            recent: recentSales,
            activeRanges: rangeCounts,
          },
        },
        (_, value) => (typeof value === 'bigint' ? Number(value) : value),
        2,
      ),
    );
  } finally {
    await connection?.end();
  }
}

inspectDatabase().catch((error) => {
  console.error(`No se pudo consultar la base: ${error.message}`);
  process.exitCode = 1;
});
