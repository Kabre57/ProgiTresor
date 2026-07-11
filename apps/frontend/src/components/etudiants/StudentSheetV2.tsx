import React from 'react';

interface Transaction {
  refTresor: string;
  libelleProduitBrut: string;
  montant: number;
  dateHeure: string;
}

interface PricingReference {
  type: string;
  year1: string;
  year2: string;
  year3: string;
}

interface StudentSheetProps {
  // Infos Personnelles
  studentName: string;
  matricule: string;
  photoUrl?: string;
  antenne: string;
  promotion: string;
  statutEtudiant: string; // National / Non-National
  
  // Infos Académiques
  filiere: string;
  
  // Résumé Financier
  totalPayments: number;
  totalAmount: string;
  status: string;
  soldeRestant?: number;
  expectedTotal?: number;
  
  // Listes
  transactions: Transaction[];
  pricingReferences: PricingReference[];
}

const StudentSheet: React.FC<StudentSheetProps> = ({
  studentName,
  matricule,
  photoUrl,
  antenne,
  promotion,
  statutEtudiant,
  filiere,
  totalPayments,
  totalAmount,
  status,
  soldeRestant,
  expectedTotal,
  transactions,
  pricingReferences,
}) => {
  const finalExpectedTotal = expectedTotal !== undefined 
    ? `${expectedTotal.toLocaleString()} FCFA` 
    : totalAmount;

  const finalStatus = soldeRestant !== undefined 
    ? (soldeRestant === 0 ? 'À JOUR' : 'SOLDE IMPAYÉ') 
    : status;

  const statusBgColor = finalStatus === 'À JOUR' 
    ? 'bg-green-600' 
    : 'bg-red-600';

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-md font-sans text-gray-800 border border-gray-200">
      {/* Header */}
      <div className="text-center border-b-2 border-blue-700 mb-8 pb-4">
        <h1 className="text-2xl font-bold text-blue-700 uppercase">Fiche Individuelle de Scolarité</h1>
        <p className="text-gray-600 font-medium">Système de Gestion Trésor Pay - INFAS 2024</p>
      </div>

      {/* Profile Section with Photo */}
      <div className="flex flex-col md:flex-row gap-8 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
        {/* Photo Container */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          <div className="w-40 h-48 bg-gray-200 border-2 border-blue-700 rounded-md overflow-hidden flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt={studentName} className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-400 text-center p-2">
                <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">Photo non disponible</span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Info */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">Nom & Prénoms</p>
            <p className="text-lg font-bold text-gray-900">{studentName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">Matricule</p>
            <p className="text-lg font-bold text-blue-700">{matricule}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">Antenne</p>
            <p className="font-medium">{antenne}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">Promotion</p>
            <p className="font-medium">{promotion}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">Filière</p>
            <p className="font-medium">{filiere}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">Statut</p>
            <p className="font-medium">{statutEtudiant}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex-1 min-w-[150px] p-5 rounded-lg text-center text-white bg-blue-600 shadow-sm">
          <h3 className="text-sm font-medium uppercase opacity-90">Paiements Effectués</h3>
          <p className="text-2xl font-bold mt-1">{totalPayments.toLocaleString()} FCFA</p>
        </div>
        <div className="flex-1 min-w-[150px] p-5 rounded-lg text-center text-white bg-green-600 shadow-sm">
          <h3 className="text-sm font-medium uppercase opacity-90">Total Mobilisé</h3>
          <p className="text-2xl font-bold mt-1">{finalExpectedTotal}</p>
        </div>
        <div className={`flex-1 min-w-[150px] p-5 rounded-lg text-center text-white ${statusBgColor} shadow-sm`}>
          <h3 className="text-sm font-medium uppercase opacity-90">Situation Financière</h3>
          <p className="text-2xl font-bold mt-1 uppercase">{finalStatus}</p>
        </div>
        {soldeRestant !== undefined && soldeRestant > 0 && (
          <div className="flex-1 min-w-[150px] p-5 rounded-lg text-center text-white bg-red-700 shadow-sm animate-pulse">
            <h3 className="text-sm font-medium uppercase opacity-90">Reste à Payer</h3>
            <p className="text-2xl font-bold mt-1">{soldeRestant.toLocaleString()} FCFA</p>
          </div>
        )}
      </div>

      {/* Personal History */}
      <h2 className="text-xl font-bold text-blue-700 border-l-4 border-blue-700 pl-3 mt-10 mb-4">Historique des Transactions Trésor Pay</h2>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="p-3 text-left">Référence Trésor</th>
              <th className="p-3 text-left">Désignation du Produit</th>
              <th className="p-3 text-right">Montant</th>
              <th className="p-3 text-center">Date de Paiement</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? transactions.map((tx, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-3 border-b border-gray-100 font-mono text-xs">{tx.refTresor}</td>
                <td className="p-3 border-b border-gray-100">{tx.libelleProduitBrut}</td>
                <td className="p-3 border-b border-gray-100 text-right font-bold">{tx.montant.toLocaleString()} FCFA</td>
                <td className="p-3 border-b border-gray-100 text-center">{tx.dateHeure}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">Aucune transaction enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pricing Reference */}
      <h2 className="text-xl font-bold text-blue-700 border-l-4 border-blue-700 pl-3 mt-10 mb-4">Référentiel des Tarifs Applicables</h2>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="p-3 text-left">Nature des Frais</th>
              <th className="p-3 text-center">Année 1</th>
              <th className="p-3 text-center">Année 2</th>
              <th className="p-3 text-center">Année 3</th>
            </tr>
          </thead>
          <tbody>
            {pricingReferences.map((ref, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-3 border-b border-gray-100 font-semibold">{ref.type}</td>
                <td className="p-3 border-b border-gray-100 text-center">{ref.year1}</td>
                <td className="p-3 border-b border-gray-100 text-center">{ref.year2}</td>
                <td className="p-3 border-b border-gray-100 text-center">{ref.year3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Validation */}
      <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between items-end">
        <div className="text-xs text-gray-400 italic max-w-md">
          Ce document est une synthèse numérique certifiée des paiements effectués via la plateforme Trésor Pay. Toute falsification est passible de sanctions.
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-700">Fait à Abidjan, le {new Date().toLocaleDateString('fr-FR')}</p>
          <div className="mt-2 h-16 w-32 bg-gray-50 border border-dashed border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-300">
            Cachet Numérique
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSheet;
