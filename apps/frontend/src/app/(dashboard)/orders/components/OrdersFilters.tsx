import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';

type OrdersFiltersProps = {
  antenneSelectOptions: { value: string; label: string }[];
  niveauSelectOptions: { value: string; label: string }[];
  typeRecetteSelectOptions: { value: string; label: string }[];
  periodSelectOptions: { value: string; label: string }[];
  statutSelectOptions: { value: string; label: string }[];
  selectedAntenneId: string;
  setSelectedAntenneId: (val: string) => void;
  selectedNiveauId: string;
  setSelectedNiveauId: (val: string) => void;
  selectedTypeRecetteId: string;
  setSelectedTypeRecetteId: (val: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (val: string) => void;
  selectedStatut: string;
  setSelectedStatut: (val: string) => void;
  setPage: (page: number) => void;
};

export function OrdersFilters({
  antenneSelectOptions,
  niveauSelectOptions,
  typeRecetteSelectOptions,
  periodSelectOptions,
  statutSelectOptions,
  selectedAntenneId,
  setSelectedAntenneId,
  selectedNiveauId,
  setSelectedNiveauId,
  selectedTypeRecetteId,
  setSelectedTypeRecetteId,
  selectedPeriod,
  setSelectedPeriod,
  selectedStatut,
  setSelectedStatut,
  setPage,
}: OrdersFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtres de tri</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <Select
              label="Antenne (INFAS)"
              options={antenneSelectOptions}
              value={selectedAntenneId}
              onChange={(e) => {
                setSelectedAntenneId(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Select
              label="Promotion"
              options={niveauSelectOptions}
              value={selectedNiveauId}
              onChange={(e) => {
                setSelectedNiveauId(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Select
              label="Type de recette"
              options={typeRecetteSelectOptions}
              value={selectedTypeRecetteId}
              onChange={(e) => {
                setSelectedTypeRecetteId(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Select
              label="Période d&apos;analyse"
              options={periodSelectOptions}
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Select
              label="Statut"
              options={statutSelectOptions}
              value={selectedStatut}
              onChange={(e) => {
                setSelectedStatut(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
