'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { NumericFormat } from 'react-number-format'
import { TbPlus } from 'react-icons/tb'
import { PiLightningFill } from 'react-icons/pi'

import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import CreditCardDialog from '@/components/view/CreditCardDialog'
import BillingHistory from './BillingHistory'
import { apiGetSettingsBilling } from '@/lib/api/accountApi'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import sleep from '@/utils/sleep'

// Student dynamic imports
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useEtudiantMe, useReferential } from '@/lib/hooks/useEtudiantQueries'
import { useTransactions } from '@/lib/hooks/useOperationsQueries'
import { transactionApi } from '@/lib/api/transactionApi'
import { getErrorMessage } from '@/lib/api/client'
import { BillingTab, type DeclarationInput } from '@/components/etudiant-portail/BillingTab'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Transaction } from '@/types/transaction.types'
import type { NomenclatureProduit } from '@/types/etudiant.types'
import type { GetSettingsBillingResponse, CreditCard, CreditCardInfo } from '../types'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const declarationSchema = z.object({
  refTresor: z.string().trim().min(4, 'Veuillez saisir une reference valide'),
  montant: z.string().min(1, 'Le montant est requis'),
  dateHeure: z.string().min(10, "Veuillez selectionner la date et l'heure du paiement"),
  libelleProduitBrut: z.string().trim().min(1, 'Le libelle du produit est requis'),
})

const isApplicableNomenclature = (
  item: NomenclatureProduit,
  niveauId: number,
  filiereId: number | null,
  statutId: number,
) => {
  const niveauMatches = item.niveauId === null || item.niveauId === niveauId
  const filiereMatches = item.filiereId === null || filiereId === null || item.filiereId === filiereId
  const statutMatches = item.statutId === null || item.statutId === statutId
  return item.actif && niveauMatches && filiereMatches && statutMatches
}

const StudentBillingView = () => {
  const toastNotification = useToast()
  const { data: etudiant, isLoading: isEtudiantLoading } = useEtudiantMe()
  const { data: nomenclatures = [], isLoading: isNomenclatureLoading } = useReferential('nomenclatures')

  const transactionParams = useMemo(
    () => ({ etudiantMatricule: etudiant?.matricule ?? '__pending__', limit: 100 }),
    [etudiant?.matricule],
  )

  const {
    data: transactionsData,
    isLoading: isTxLoading,
    refetch: refetchTransactions,
  } = useTransactions(transactionParams)

  const transactions = useMemo(() => transactionsData?.list ?? [], [transactionsData?.list])
  const validatedTransactions = useMemo(
    () => transactions.filter((tx) => {
      const status = String(tx.statutTraitement ?? tx.statut ?? 'EN_ATTENTE').toUpperCase()
      return status.includes('AFFECTE') || status.includes('PAYE') || status.includes('PAID') || status.includes('VALID')
    }),
    [transactions],
  )

  const applicableNomenclatures = useMemo(() => {
    if (!etudiant) return []
    return nomenclatures.filter((item) =>
      isApplicableNomenclature(item, etudiant.niveauId, etudiant.filiereId, etudiant.statutId),
    )
  }, [etudiant, nomenclatures])

  const totalFees = applicableNomenclatures.reduce((sum, item) => sum + Number(item.montant ?? 0), 0)
  const totalPaid = validatedTransactions.reduce((sum, tx) => sum + Number(tx.montant ?? 0), 0)
  const restToPay = Math.max(0, totalFees - totalPaid)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset: resetDeclaration,
  } = useForm<DeclarationInput>({
    resolver: zodResolver(declarationSchema),
  })

  const onSubmitDeclaration = async (values: DeclarationInput) => {
    if (!etudiant?.matricule) return
    try {
      await transactionApi.import({
        nomFichier: `declaration_etudiant_${etudiant.matricule}_${Date.now()}.json`,
        typeFichier: 'JSON',
        auteurId: 0,
        items: [
          {
            refTresor: values.refTresor.trim(),
            montant: Number(values.montant),
            dateHeure: new Date(values.dateHeure),
            etudiantMatricule: etudiant.matricule,
            nomPayeurBrut: `${etudiant.nom} ${etudiant.prenom}`,
            libelleProduitBrut: values.libelleProduitBrut.trim(),
          },
        ],
      })
      toastNotification.success('Votre recu de paiement Tresor Pay a bien ete declare.')
      resetDeclaration()
      refetchTransactions()
    } catch (err) {
      toastNotification.error(getErrorMessage(err))
    }
  }

  const downloadReceipt = (tx: Transaction) => {
    if (!etudiant) return
    const txRef = String(tx.refTresor ?? tx.reference ?? tx.id ?? '-')
    const txStatus = String(tx.statutTraitement ?? tx.statut ?? 'EN_ATTENTE')
    const rawDate = tx.dateHeure ?? tx.dateTransaction ?? tx.createdAt
    const txDate = typeof rawDate === 'string' || rawDate instanceof Date ? rawDate : null
    const isPaid = txStatus.toUpperCase().includes('AFFECTE') || txStatus.toUpperCase().includes('PAYE') || txStatus.toUpperCase().includes('PAID') || txStatus.toUpperCase().includes('VALID')

    const content = `
=====================================================
              RECU DE PAIEMENT PROGITRESOR
=====================================================
Date d'edition      : ${new Date().toLocaleDateString('fr-FR')}
Reference Tresor    : ${txRef}
Date du paiement    : ${formatDate(txDate)}
Montant             : ${formatCurrency(Number(tx.montant ?? 0))}
Statut              : ${isPaid ? 'Rapproche avec succes' : 'En attente'}

INFORMATIONS ETUDIANT
Matricule interne   : ${etudiant.matricule}
Nom complet         : ${etudiant.nom} ${etudiant.prenom}
Filiere / Niveau    : ${etudiant.filiere?.libelle || '-'}
Antenne             : ${etudiant.antenne?.nom || '-'}
Statut              : ${etudiant.statut?.libelle || '-'}

Document genere depuis le portail etudiant ProgiTresor.
=====================================================
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `recu_paiement_${txRef}.txt`
    link.click()
    URL.revokeObjectURL(url)
    toastNotification.success('Telechargement du recu demarre.')
  }

  const downloadCertificat = () => {
    if (!etudiant) return
    const content = `
=====================================================
                CERTIFICAT DE SCOLARITE
=====================================================
Annee academique : ${etudiant.promotion?.nom || etudiant.promotionString || '-'}

ProgiTresor certifie que l'etudiant :
Nom complet      : ${etudiant.nom} ${etudiant.prenom}
Matricule        : ${etudiant.matricule}
Filiere / Niveau : ${etudiant.filiere?.libelle || '-'}
Statut           : ${etudiant.statut?.libelle || '-'}
Antenne          : ${etudiant.antenne?.nom || '-'}

est regulierement inscrit au titre de l'annee academique en cours.

Fait le ${new Date().toLocaleDateString('fr-FR')}.
=====================================================
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `certificat_scolarite_${etudiant.matricule}.txt`
    link.click()
    URL.revokeObjectURL(url)
    toastNotification.success('Telechargement du certificat demarre.')
  }

  if (isEtudiantLoading) {
    return (
      <div className="flex h-[30vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!etudiant) {
    return (
      <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 rounded-xl text-center font-semibold">
        Profil etudiant introuvable pour la session actuelle.
      </div>
    )
  }

  return (
    <BillingTab
      totalFees={totalFees}
      totalPaid={totalPaid}
      restToPay={restToPay}
      applicableNomenclatures={applicableNomenclatures}
      isNomenclatureLoading={isNomenclatureLoading}
      isTxLoading={isTxLoading}
      transactions={transactions}
      register={register}
      handleSubmit={handleSubmit}
      errors={errors}
      isSubmitting={isSubmitting}
      onSubmitDeclaration={onSubmitDeclaration}
      downloadReceipt={downloadReceipt}
      downloadCertificat={downloadCertificat}
      onGlobalReceiptClick={() => {
        if (!transactions.length) {
          toastNotification.error('Aucun paiement disponible pour generer un recu global.')
          return
        }
        downloadReceipt({
          refTresor: 'GLOBAL',
          montant: totalPaid,
          dateHeure: new Date().toISOString(),
          statutTraitement: 'AFFECTE',
        } as Transaction)
      }}
    />
  )
}

const SettingsBilling = () => {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const isStudent = user?.role?.code === 'ETUDIANT' || user?.role?.code === 'Etudiant'

  const [selectedCard, setSelectedCard] = useState<{
    type: 'NEW' | 'EDIT' | ''
    dialogOpen: boolean
    cardInfo: Partial<CreditCardInfo>
  }>({
    type: '',
    dialogOpen: false,
    cardInfo: {},
  })

  const {
    data = {
      currentPlan: {
        plan: '',
        status: '',
        billingCycle: '',
        nextPaymentDate: null,
        amount: null,
      },
      paymentMethods: [],
      transactionHistory: [],
    },
  } = useSWR(
    isStudent ? null : '/api/settings/billing/',
    () => apiGetSettingsBilling<GetSettingsBillingResponse>(),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    },
  )

  const handleEditCreditCard = (card: Partial<CreditCard>) => {
    setSelectedCard({ type: 'EDIT', dialogOpen: true, cardInfo: card })
  }

  const handleCreditCardDialogClose = () => {
    setSelectedCard({ type: '', dialogOpen: false, cardInfo: {} })
  }

  const handleEditCreditCardSubmit = async () => {
    await sleep(500)
    handleCreditCardDialogClose()
    toast.push(<Notification type="success">Credit card updated!</Notification>, { placement: 'top-center' })
  }

  const handleAddCreditCardSubmit = async (values: unknown) => {
    await sleep(500)
    handleCreditCardDialogClose()
    toast.push(<Notification type="success">Credit card added!</Notification>, { placement: 'top-center' })
  }

  const handleChangePlan = () => {
    router.push('/concepts/account/pricing?subcription=basic&cycle=monthly')
  }

  if (isStudent) {
    return <StudentBillingView />
  }

  return (
    <div>
      <h4 className="mb-4">Billing</h4>
      <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <Avatar className="bg-emerald-500" shape="circle" icon={<PiLightningFill />} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h6 className="font-bold">{data.currentPlan.plan}</h6>
                <Tag className="bg-success-subtle text-success rounded-md border-0">
                  <span className="capitalize">{data.currentPlan.status}</span>
                </Tag>
              </div>
              <div className="font-semibold">
                <span>Billing {data.currentPlan.billingCycle}</span>
                <span> | </span>
                <span>
                  Next payment on{' '}
                  {dayjs.unix((data.currentPlan.nextPaymentDate as number) || 0).format('MM/DD/YYYY')}
                </span>
                <span>
                  <span className="mx-1">for</span>
                  <NumericFormat
                    className="font-bold heading-text"
                    displayType="text"
                    value={(Math.round((data.currentPlan.amount || 0) * 100) / 100).toFixed(2)}
                    prefix={'$'}
                    thousandSeparator={true}
                  />
                </span>
              </div>
            </div>
          </div>
          <div className="flex">
            <Button size="sm" variant="solid" onClick={handleChangePlan}>
              Change plan
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <h5>Payment method</h5>
        <div>
          {data.paymentMethods?.map((card, index) => (
            <div
              key={card.cardId}
              className={classNames(
                'flex items-center justify-between p-4',
                !isLastChild(data.paymentMethods, index) && 'border-b border-gray-200 dark:border-gray-600',
              )}
            >
              <div className="flex items-center">
                {card.cardType === 'VISA' && <img src="/img/others/img-8.png" alt="visa" />}
                {card.cardType === 'MASTER' && <img src="/img/others/img-9.png" alt="master" />}
                <div className="ml-3 rtl:mr-3">
                  <div className="flex items-center">
                    <div className="text-gray-900 dark:text-gray-100 font-semibold">
                      {card.cardHolderName} •••• {card.last4Number}
                    </div>
                    {card.primary && (
                      <Tag className="bg-primary-subtle text-primary rounded-md border-0 mx-2">
                        <span className="capitalize"> Primary </span>
                      </Tag>
                    )}
                  </div>
                  <span>
                    Expired {months[parseInt(card.expMonth) - 1]} 20{card.expYear}
                  </span>
                </div>
              </div>
              <div className="flex">
                <Button size="sm" type="button" onClick={() => handleEditCreditCard(card)}>
                  Edit
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="plain"
            icon={<TbPlus />}
            onClick={() => {
              setSelectedCard({ type: 'NEW', dialogOpen: true, cardInfo: {} })
            }}
          >
            Add payment method
          </Button>
        </div>
      </div>
      <div className="mt-8">
        <h5>Transaction history</h5>
        <BillingHistory className="mt-4" data={data.transactionHistory} />
      </div>
      <CreditCardDialog
        title={selectedCard.type === 'NEW' ? 'Add credit card' : 'Edit credit card'}
        defaultValues={selectedCard.cardInfo as CreditCard}
        dialogOpen={selectedCard.dialogOpen}
        onDialogClose={handleCreditCardDialogClose}
        onSubmit={
          selectedCard.type === 'NEW'
            ? (values) => handleAddCreditCardSubmit(values)
            : handleEditCreditCardSubmit
        }
      />
    </div>
  )
}

export default SettingsBilling
