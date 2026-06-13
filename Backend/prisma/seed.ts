import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    const sistemas = await prisma.usuario.create({
        data: {
            nombre: "Sistemas",
            username: "sistemas",
            password: "$2a$12$/Ki8aUwoeYcWFx790zCLxOEDAme8kuwZ.cl/Fv9OZ9p4fxawR64e2",
        }
    });

    console.log(`Usuario creado: ${sistemas.username}`);

    const assets = await prisma.asset.create({
        data: {
            flag_pe: `uploads/icon/peru.png`,
            flag_es: `uploads/icon/spain.png`,
        }
    });

    console.log(`Assets creados: ${assets.id}`);
}

main()
    .catch((e) => {
        console.error("Error seeding database:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });