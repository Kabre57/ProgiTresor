import type { GetActivityLogResponse } from '@/app/(dashboard)/account/activity-log/types';

export async function apiGetLogs<T, U extends Record<string, unknown>>(params: U): Promise<T> {
  const logs: GetActivityLogResponse = {
    data: [
      {
        id: '1',
        date: Date.now() - 3600000,
        events: [
          {
            type: 'ADD_STUDENT',
            dateTime: Date.now() - 3600000,
            userName: 'Theo Kabre',
            comment: 'A créé la fiche de l\'étudiant KOUAME Affoue Marie.',
          },
          {
            type: 'IMPORT_TRANSACTIONS',
            dateTime: Date.now() - 7200000,
            userName: 'Theo Kabre',
            comment: 'A importé 45 transactions depuis le relevé-tresor.csv.',
          }
        ]
      }
    ],
    loadable: false,
  };
  return Promise.resolve(logs as unknown as T);
}
