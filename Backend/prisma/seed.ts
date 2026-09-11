import { Periodo, PrismaClient, TipoEmpleado } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    const sistemas = await prisma.usuario.upsert({
      where: {
        username: 'sistemas',
      },
      update: {},
      create: {
        nombre: 'Sistemas',
        username: 'sistemas',
        password: '$2a$12$/Ki8aUwoeYcWFx790zCLxOEDAme8kuwZ.cl/Fv9OZ9p4fxawR64e2',
      },
    });

    console.log(`Usuario disponible: ${sistemas.username}`);

    const assets = await prisma.asset.upsert({
      where: {
        id: 1,
      },
      update: {},
      create: {
        id: 1,
        flag_pe: 'uploads/icon/peru.png',
        flag_es: 'uploads/icon/spain.png',
      },
    });

    console.log(`Asset disponible: ${assets.id}`);

    const configAgente = await prisma.configRanking.upsert({
      where: {
        id: 1,
      },
      update: {},
      create: {
        periodo: Periodo.SEMANAL,
        hora_inicio: 0,
        minuto_inicio: 0,
        dia_semana: 5, // Viernes
        dia_mes: 1,
        mes_inicio: 1,
        zona_horaria: 'America/Lima',
      },
    });

    console.log('Configuracion default para rankings.')
  }

main()
    .catch((e) => {
        console.error("Error seeding database:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });