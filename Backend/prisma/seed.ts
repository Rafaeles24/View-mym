import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL no está configurada.');
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
});

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
  }

main()
    .catch((e) => {
        console.error("Error seeding database:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
