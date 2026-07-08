import { prisma } from '../src/utils/prisma';

async function run() {
  console.log('=== DEBUT DU TEST DE CHARGE OUTBOX ===');
  console.log('Nettoyage des anciennes écritures de test...');
  await prisma.$executeRaw`DELETE FROM outbox_message WHERE type = 'CREATE_ACCOUNTING_ENTRY'`;

  const count = 1000;
  console.log(`Insertion de ${count} messages Outbox PENDING...`);

  const messagesData = Array.from({ length: count }, (_, i) => ({
    type: 'CREATE_ACCOUNTING_ENTRY',
    payload: {
      codeOt: `LOAD-TEST-OT-${Date.now()}-${i}`,
      montant: Math.floor(Math.random() * 100000) + 1,
    },
    status: 'PENDING',
  }));

  const startTime = Date.now();

  const chunkSize = 200;
  for (let i = 0; i < messagesData.length; i += chunkSize) {
    const chunk = messagesData.slice(i, i + chunkSize);
    await prisma.outboxMessage.createMany({
      data: chunk,
    });
  }

  console.log(`Insertion réussie en ${Date.now() - startTime}ms.`);
  console.log('Attente du traitement par le Worker Outbox...');

  const timeout = 60000; // 60s max
  let elapsed = 0;
  const interval = 500;

  while (elapsed < timeout) {
    const pendingCount = await prisma.outboxMessage.count({
      where: {
        status: 'PENDING',
        type: 'CREATE_ACCOUNTING_ENTRY',
      },
    });

    if (pendingCount === 0) {
      const duration = (Date.now() - startTime) / 1000;
      console.log('==================================================');
      console.log(`SUCCESS : Les 1000 messages ont été traités en ${duration.toFixed(2)} secondes !`);
      console.log('==================================================');
      if (duration <= 30) {
        console.log('TEST VALIDE : Le traitement a duré moins de 30 secondes.');
        process.exit(0);
      } else {
        console.error('TEST ECHOUE : Le traitement a pris plus de 30 secondes.');
        process.exit(1);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
    elapsed += interval;
  }

  console.error('TEST ECHOUE : Timeout de 60 secondes dépassé.');
  process.exit(1);
}

run()
  .catch((err) => {
    console.error('Erreur lors du test de charge:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
