'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useSWR from 'swr'
import { TbCircleCheckFilled, TbRosetteDiscountCheckFilled } from 'react-icons/tb'

import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import Dialog from '@/components/ui/Dialog'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import { apiGetSettingsIntergration } from '@/lib/api/accountApi'
import type { GetSettingsIntegrationResponse, Integration } from '../types'

// Student dynamic imports
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useEtudiantMe, useMapTresorPay } from '@/lib/hooks/useEtudiantQueries'
import { IntegrationTab, type MappingInput } from '@/components/etudiant-portail/IntegrationTab'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/lib/api/client'

const mappingSchema = z.object({
  matriculeTresorPay: z
    .string()
    .trim()
    .min(1, 'Le matricule Tresor Pay est requis pour la mise a jour'),
})

const StudentIntegrationView = () => {
  const toastNotification = useToast()
  const { data: etudiant, isLoading: isEtudiantLoading, refetch } = useEtudiantMe()
  const mapTresorPay = useMapTresorPay()
  const [isEditingMatricule, setIsEditingMatricule] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MappingInput>({
    resolver: zodResolver(mappingSchema),
  })

  const onSubmitMapping = async (values: MappingInput) => {
    try {
      await mapTresorPay.mutateAsync({
        matriculeTresorPay: values.matriculeTresorPay,
      })
      toastNotification.success('Votre matricule Tresor Pay a bien ete mis a jour.')
      setIsEditingMatricule(false)
      refetch()
    } catch (err) {
      toastNotification.error(getErrorMessage(err), 'Matricule invalide, veuillez verifier le format.')
    }
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
    <IntegrationTab
      etudiant={etudiant}
      isEditingMatricule={isEditingMatricule}
      setIsEditingMatricule={setIsEditingMatricule}
      register={register}
      handleSubmit={handleSubmit}
      errors={errors}
      isSubmitting={isSubmitting}
      onSubmitMapping={onSubmitMapping}
      mapTresorPayPending={mapTresorPay.isPending}
    />
  )
}

const SettingIntegration = () => {
  const user = useAuthStore((state) => state.user)
  const isStudent = user?.role?.code === 'ETUDIANT' || user?.role?.code === 'Etudiant'

  const [selectedIntegration, setSelectedIntegration] = useState<{
    integration: Partial<Integration>
    dialogOpen: boolean
  }>({
    integration: {},
    dialogOpen: false,
  })

  const { data = [], mutate } = useSWR(
    isStudent ? null : '/api/settings/integration/',
    () => apiGetSettingsIntergration<GetSettingsIntegrationResponse>(),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    },
  )

  const handleToggle = (bool: boolean, id: string) => {
    const newData = structuredClone(data)
    mutate(
      newData.map((app) => {
        if (app.id === id) {
          app.active = bool
        }
        return app
      }),
      false,
    )
  }

  const handleDialogClose = () => {
    setSelectedIntegration({ integration: {}, dialogOpen: false })
  }

  if (isStudent) {
    return <StudentIntegrationView />
  }

  return (
    <div>
      <h4>Integration</h4>
      <p>Supercharge your workflow using these integration</p>
      <div className="mt-4">
        {data.map((app, index) => (
          <div
            key={app.id}
            className={classNames(
              'flex items-center justify-between py-6 border-gray-200 dark:border-gray-700',
              !isLastChild(data, index) && 'border-b',
            )}
          >
            <div className="flex items-center gap-4">
              <Avatar
                className="bg-transparent dark:bg-transparent p-2 border-2 border-gray-200 dark:border-gray-700"
                size={50}
                src={app.img}
                shape="round"
              />
              <div>
                <h6 className="font-bold">{app.name}</h6>
                <span>{app.desc}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="plain"
                onClick={() => setSelectedIntegration({ dialogOpen: true, integration: app })}
              >
                Learn more
              </Button>
              <Switcher checked={app.active} onChange={(val) => handleToggle(val, app.id)} />
            </div>
          </div>
        ))}
      </div>
      <Dialog
        isOpen={selectedIntegration.dialogOpen}
        onClose={handleDialogClose}
        onRequestClose={handleDialogClose}
      >
        <div className="flex items-center gap-3">
          <Avatar
            className="bg-transparent dark:bg-transparent p-2 border-2 border-gray-200 dark:border-gray-600"
            size={55}
            src={selectedIntegration.integration.img}
            shape="round"
          />
          <div>
            <div className="flex items-center gap-1">
              <h6 className="font-bold">{selectedIntegration.integration.name}</h6>
              <TbRosetteDiscountCheckFilled className="text-primary text-lg" />
            </div>
            <span className="flex gap-2">
              <span>{selectedIntegration.integration.type}</span>
            </span>
          </div>
        </div>
        <div className="mt-6">
          <span className="font-bold heading-text">Overview</span>
          <p className="mt-2">
            Wings medium plunger pot, redeye doppio siphon froth iced. Latte, and, barista cultivar fair trade grinder
            caramelization spoon. Whipped, grinder to go brewed est single shot half and half. Plunger pot blue mountain et
            blue mountain grinder carajillo, saucer half and half milk instant strong.
          </p>
          <div className="mt-6">
            <span className="font-bold heading-text">Key Features:</span>
            <ul className="list-disc mt-4 flex flex-col gap-3">
              <li className="flex gap-2">
                <TbCircleCheckFilled className="text-xl text-emerald-500" />
                <span>Fair trade, cortado con panna, crema foam cinnamon aged.</span>
              </li>
              <li className="flex gap-2">
                <TbCircleCheckFilled className="text-xl text-emerald-500" />
                <span>Mug saucer acerbic, caffeine organic kopi-luwak galão siphon.</span>
              </li>
              <li className="flex gap-2">
                <TbCircleCheckFilled className="text-xl text-emerald-500" />
                <span>To go half and half cultivar single origin ut, french press.</span>
              </li>
              <li className="flex gap-2">
                <TbCircleCheckFilled className="text-xl text-emerald-500" />
                <span>Mocha latte flavour cortado cup kopi-luwak.</span>
              </li>
            </ul>
          </div>
        </div>
        <div className=" mt-6">
          <Button block onClick={handleDialogClose}>
            Acknowledge
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

export default SettingIntegration
