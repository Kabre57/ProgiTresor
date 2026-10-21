import { AppError } from '../utils/errors';

export async function fetchStudentPayments(studentId: number): Promise<any[]> {
  const base = process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:5003';
  const transactions: any[] = [];
  const limit = 200;
  let total = Infinity;
  while (transactions.length < total) {
    const query = new URLSearchParams({
      etudiantId: String(studentId), statutTraitement: 'CLASSE',
      limit: String(limit), offset: String(transactions.length),
    });
    let response: Response;
    try {
      response = await fetch(`${base}/?${query}`, {
        headers: {
          'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
          'x-user-permissions': JSON.stringify({ IMPORT: 1 }),
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new AppError(503, 'Le service des paiements est momentanément indisponible.');
    }
    if (!response.ok) throw new AppError(503, 'Impossible de consulter les paiements de l’étudiant.');
    const data = await response.json() as { list?: any[]; total?: number };
    if (!Array.isArray(data.list) || !Number.isSafeInteger(data.total) || data.total! < 0) {
      throw new AppError(503, 'Réponse du service des paiements invalide.');
    }
    total = data.total!;
    if (!data.list.length && transactions.length < total) {
      throw new AppError(503, 'La liste des paiements est incomplète. Réessayez.');
    }
    transactions.push(...data.list);
  }
  return transactions;
}
