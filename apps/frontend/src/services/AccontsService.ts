import type {
  GetSettingsProfileResponse,
  GetSettingsNotificationResponse,
  GetSettingsBillingResponse,
  GetSettingsIntegrationResponse
} from '@/app/(dashboard)/account/settings/types';

export async function apiGetSettingsProfile<T>(): Promise<T> {
  const profile: GetSettingsProfileResponse = {
    id: '1',
    name: 'Theo Kabre',
    firstName: 'Theo',
    lastName: 'Kabre',
    email: 'carolyn_h@hotmail.com',
    img: '',
    location: 'Abidjan, Côte d\'Ivoire',
    address: '123 Main St',
    postcode: '10001',
    city: 'Abidjan',
    country: 'CI',
    dialCode: '+225',
    birthday: '1995-10-12',
    phoneNumber: '121231234',
  };
  return Promise.resolve(profile as unknown as T);
}

export async function apiGetSettingsNotification<T>(): Promise<T> {
  const notif: GetSettingsNotificationResponse = {
    email: ['appUpdate', 'newOrder'],
    desktop: true,
    unreadMessageBadge: true,
    notifymeAbout: 'all',
  };
  return Promise.resolve(notif as unknown as T);
}

export async function apiGetSettingsBilling<T>(): Promise<T> {
  const billing: GetSettingsBillingResponse = {
    paymentMethods: [
      {
        cardId: '1',
        cardHolderName: 'Theo Kabre',
        cardType: 'visa',
        expMonth: '12',
        expYear: '28',
        last4Number: '4242',
        primary: true,
      }
    ],
    transactionHistory: [
      {
        id: 'TX-10043',
        item: 'Inscription Licence 1',
        status: 'completed',
        amount: 30000,
        date: Date.now() - 86400000 * 2,
      }
    ],
    currentPlan: {
      plan: 'Gratuit',
      status: 'active',
      billingCycle: 'mensuel',
      nextPaymentDate: Date.now() + 86400000 * 30,
      amount: 0,
    }
  };
  return Promise.resolve(billing as unknown as T);
}

export async function apiGetSettingsIntergration<T>(): Promise<T> {
  const integration: GetSettingsIntegrationResponse = [
    {
      id: '1',
      name: 'Trésor Pay',
      desc: 'Intégration directe des flux de paiement de l\'État.',
      img: '/img/integrations/tresorpay.png',
      type: 'payment',
      active: true,
      installed: true,
    }
  ];
  return Promise.resolve(integration as unknown as T);
}
