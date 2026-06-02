const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando datos iniciales...');

  // Usuario admin
  const passwordHash = await bcrypt.hash('Admin2024!', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@taxgestar.com' },
    update: {},
    create: {
      email: 'admin@taxgestar.com',
      passwordHash,
      nombre: 'Administrador Gestar Tax',
      rol: 'ADMIN',
    },
  });

  // Empresa demo
  const empresa = await prisma.empresa.upsert({
    where: { ruc: '155-123456-2-2024' },
    update: {},
    create: {
      nombre: 'Empresa Demo S.A.',
      ruc: '155-123456-2-2024',
      dv: '45',
      regimen: 'GENERAL',
      periodoFiscal: 'ENERO-DICIEMBRE',
      esGranContribuyente: false,
      actividadEconomica: 'Comercio al por menor',
      email: 'demo@empresademo.com',
    },
  });

  // Vincular admin a empresa demo
  await prisma.empresaUsuario.upsert({
    where: { empresaId_usuarioId: { empresaId: empresa.id, usuarioId: admin.id } },
    update: {},
    create: { empresaId: empresa.id, usuarioId: admin.id, rol: 'ADMIN' },
  });

  console.log('✓ Usuario admin:', admin.email);
  console.log('✓ Empresa demo:', empresa.nombre, '- RUC:', empresa.ruc);
  console.log('Seed completado.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
