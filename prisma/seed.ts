import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import "dotenv/config";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@suport.com" },
  });

  if (existingAdmin) {
    console.log("Seed já executado - admin@suport.com já existe.");
    await prisma.$disconnect();
    return;
  }

  const operatorOrg = await prisma.organization.create({
    data: { name: "Equipe Suporte", type: "OPERATOR" },
  });

  const clientOrg = await prisma.organization.create({
    data: { name: "Cliente Demo", type: "CLIENT" },
  });

  const passwordHash = await hash("admin123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@suport.com",
      passwordHash,
      role: "ADMIN",
      organizationId: operatorOrg.id,
    },
  });

  const dev = await prisma.user.create({
    data: {
      name: "Dev Suporte",
      email: "dev@suport.com",
      passwordHash,
      role: "MEMBER",
      organizationId: operatorOrg.id,
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      name: "Usuário Cliente",
      email: "cliente@demo.com",
      passwordHash,
      role: "ADMIN",
      organizationId: clientOrg.id,
    },
  });

  const portal = await prisma.portal.create({
    data: {
      name: "Portal Principal",
      description: "Portal de suporte principal",
      url: "https://exemplo.com",
    },
  });

  await prisma.portalAssignment.create({
    data: { portalId: portal.id, userId: dev.id },
  });

  console.log("Seed executado com sucesso!");
  console.log("");
  console.log("=== CREDENCIAIS DE ACESSO ===");
  console.log("");
  console.log("Admin (Operador):");
  console.log("  Email: admin@suport.com");
  console.log("  Senha: admin123");
  console.log("");
  console.log("Dev (Operador):");
  console.log("  Email: dev@suport.com");
  console.log("  Senha: admin123");
  console.log("");
  console.log("Cliente:");
  console.log("  Email: cliente@demo.com");
  console.log("  Senha: admin123");
  console.log("");
  console.log(`Organização Operadora: ${operatorOrg.name} (${operatorOrg.id})`);
  console.log(`Organização Cliente: ${clientOrg.name} (${clientOrg.id})`);
  console.log(`Portal: ${portal.name} (${portal.id})`);
  console.log(`Admin: ${admin.name} (${admin.id})`);
  console.log(`Dev: ${dev.name} (${dev.id})`);
  console.log(`Cliente: ${clientUser.name} (${clientUser.id})`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erro no seed:", e);
  process.exit(1);
});
