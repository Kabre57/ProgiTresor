import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export type DemoRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  demoReqType: string;
  setDemoReqType: (type: string) => void;
  onSubmitDemoRequest: (e: React.FormEvent) => void;
};

export function DemoRequestModal({
  isOpen,
  onClose,
  demoReqType,
  setDemoReqType,
  onSubmitDemoRequest,
}: DemoRequestModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Demande administrative
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitDemoRequest} className="space-y-4">
            <div>
              <label htmlFor="reqType" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Type de demande
              </label>
              <select
                id="reqType"
                className="input input-md h-11 w-full bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-lg px-3"
                value={demoReqType}
                onChange={(e) => setDemoReqType(e.target.value)}
              >
                <option value="academic">Correction filiere / niveau</option>
                <option value="antenne">Changement d'antenne</option>
                <option value="statut">Changement de statut</option>
                <option value="identity">Correction d'etat civil</option>
              </select>
            </div>
            <div>
              <label htmlFor="reqMsg" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Message
              </label>
              <textarea
                id="reqMsg"
                rows={4}
                required
                className="input input-textarea w-full bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-lg p-3"
                placeholder="Expliquez la correction demandee..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="default" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" variant="solid">
                Transmettre
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
