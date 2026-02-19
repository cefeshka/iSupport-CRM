import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ru' | 'lv';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  ru: {
    // Navigation
    'nav.dashboard': 'Панель управления',
    'nav.orders': 'Заказы',
    'nav.clients': 'Клиенты',
    'nav.inventory': 'Склад',
    'nav.purchases': 'Закупки',
    'nav.sales': 'Продажи',
    'nav.analytics': 'Аналитика',
    'nav.settings': 'Настройки',
    'nav.logout': 'Выход',

    // Common
    'common.search': 'Поиск',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Изменить',
    'common.create': 'Создать',
    'common.close': 'Закрыть',
    'common.loading': 'Загрузка...',
    'common.submit': 'Отправить',
    'common.yes': 'Да',
    'common.no': 'Нет',
    'common.add': 'Добавить',
    'common.new': 'Новый',
    'common.actions': 'Действия',
    'common.status': 'Статус',
    'common.date': 'Дата',
    'common.total': 'Всего',
    'common.phone': 'Телефон',
    'common.email': 'Email',
    'common.name': 'Имя',
    'common.notes': 'Примечания',

    // Dashboard
    'dashboard.title': 'Панель управления',
    'dashboard.stats': 'Статистика',
    'dashboard.orders': 'Заказы',
    'dashboard.revenue': 'Выручка',
    'dashboard.tasks': 'Задачи',
    'dashboard.performance': 'Производительность',

    // Orders
    'orders.title': 'Заказы',
    'orders.new': 'Новый заказ',
    'orders.list': 'Список заказов',
    'orders.device': 'Устройство',
    'orders.client': 'Клиент',
    'orders.issue': 'Проблема',
    'orders.priority': 'Приоритет',
    'orders.dueDate': 'Срок выполнения',
    'orders.assignedTo': 'Назначено',
    'orders.stage': 'Этап',
    'orders.estimatedCost': 'Ориентировочная цена',
    'orders.createOrder': 'Создать заказ',
    'orders.creating': 'Создание...',
    'orders.deviceInfo': 'Информация об устройстве',
    'orders.brand': 'Ражотājs (Brand)',
    'orders.model': 'Modelis (Model)',
    'orders.color': 'Krāsa (Color)',
    'orders.imei': 'IMEI',
    'orders.serialNumber': 'Sērijas numurs',
    'orders.problemDescription': 'Problēmas apraksts',
    'orders.detailedProblem': 'Detalizēti aprakstiet problēmu...',
    'orders.services': 'Услуги',
    'orders.parts': 'Запчасти',
    'orders.prepayment': 'Депозит / Предоплата',
    'orders.waitingForParts': 'Ожидает деталь',

    // Priority levels
    'priority.low': 'Низкий',
    'priority.medium': 'Средний',
    'priority.high': 'Высокий',
    'priority.urgent': 'Срочно',

    // Clients
    'clients.title': 'Клиенты',
    'clients.new': 'Новый клиент',
    'clients.list': 'База клиентов и история взаимодействий',
    'clients.fullName': 'Полное имя',
    'clients.phone': 'Tālrunis',
    'clients.email': 'E-pasts',
    'clients.trafficSource': 'Источник',
    'clients.createCustomer': 'Создать клиента',
    'clients.creating': 'Создание...',
    'clients.searchPlaceholder': 'Поиск по имени или телефону...',
    'clients.noClientsFound': 'Клиенты не найдены',
    'clients.contacts': 'Контакты',
    'clients.orders': 'Заказы',
    'clients.ltv': 'LTV',

    // Traffic sources
    'source.direct': 'Прямой заход',
    'source.Instagram': 'Instagram',
    'source.Google': 'Google',
    'source.Yandex': 'Yandex',
    'source.Facebook': 'Facebook',
    'source.referral': 'Рекомендация',
    'source.other': 'Другое',

    // Inventory
    'inventory.title': 'Склад',
    'inventory.new': 'Новая запчасть',
    'inventory.partName': 'Название запчасти',
    'inventory.sku': 'SKU',
    'inventory.quantity': 'Количество',
    'inventory.unitCost': 'Себестоимость',
    'inventory.location': 'Локация',
    'inventory.supplier': 'Поставщик',
    'inventory.movement': 'Движение',
    'inventory.audit': 'Инвентаризация',

    // Suppliers
    'suppliers.title': 'Поставщики',
    'suppliers.new': 'Новый поставщик',
    'suppliers.name': 'Название поставщика',
    'suppliers.contactPerson': 'Контактное лицо',
    'suppliers.phone': 'Телефон',
    'suppliers.email': 'Email',
    'suppliers.notes': 'Примечания',
    'suppliers.create': 'Создать поставщика',
    'suppliers.creating': 'Создание...',
    'suppliers.noSuppliers': 'Нет поставщиков',
    'suppliers.management': 'Управление поставщиками',

    // Settings
    'settings.title': 'Настройки системы',
    'settings.company': 'Профиль компании',
    'settings.services': 'Каталог услуг',
    'settings.suppliers': 'Поставщики',
    'settings.team': 'Команда',
    'settings.permissions': 'Права доступа',
    'settings.sources': 'Источники лидов',
    'settings.templates': 'Шаблоны документов',
    'settings.logs': 'Журнал активности',
    'settings.export': 'Экспорт данных',
    'settings.language': 'Язык',

    // Auth
    'auth.login': 'Вход',
    'auth.email': 'Email',
    'auth.password': 'Пароль',
    'auth.signIn': 'Войти',
    'auth.signOut': 'Выйти',

    // Messages
    'messages.success': 'Успешно',
    'messages.error': 'Ошибка',
    'messages.required': 'Обязательное поле',
    'messages.savedSuccessfully': 'Успешно сохранено',
    'messages.deletedSuccessfully': 'Успешно удалено',
    'messages.createdSuccessfully': 'Успешно создано',
  },
  lv: {
    // Navigation
    'nav.dashboard': 'Instrumentu panelis',
    'nav.orders': 'Pasūtījumi',
    'nav.clients': 'Klienti',
    'nav.inventory': 'Noliktava',
    'nav.purchases': 'Pirkumi',
    'nav.sales': 'Pārdošana',
    'nav.analytics': 'Analītika',
    'nav.settings': 'Iestatījumi',
    'nav.logout': 'Iziet',

    // Common
    'common.search': 'Meklēt',
    'common.save': 'Saglabāt',
    'common.cancel': 'Atcelt',
    'common.delete': 'Dzēst',
    'common.edit': 'Rediģēt',
    'common.create': 'Izveidot',
    'common.close': 'Aizvērt',
    'common.loading': 'Ielādē...',
    'common.submit': 'Iesniegt',
    'common.yes': 'Jā',
    'common.no': 'Nē',
    'common.add': 'Pievienot',
    'common.new': 'Jauns',
    'common.actions': 'Darbības',
    'common.status': 'Statuss',
    'common.date': 'Datums',
    'common.total': 'Kopā',
    'common.phone': 'Tālrunis',
    'common.email': 'E-pasts',
    'common.name': 'Vārds',
    'common.notes': 'Piezīmes',

    // Dashboard
    'dashboard.title': 'Instrumentu panelis',
    'dashboard.stats': 'Statistika',
    'dashboard.orders': 'Pasūtījumi',
    'dashboard.revenue': 'Ieņēmumi',
    'dashboard.tasks': 'Uzdevumi',
    'dashboard.performance': 'Veiktspēja',

    // Orders
    'orders.title': 'Pasūtījumi',
    'orders.new': 'Jauns pasūtījums',
    'orders.list': 'Pasūtījumu saraksts',
    'orders.device': 'Ierīce',
    'orders.client': 'Klients',
    'orders.issue': 'Problēma',
    'orders.priority': 'Prioritāte',
    'orders.dueDate': 'Izpildes termiņš',
    'orders.assignedTo': 'Piešķirts',
    'orders.stage': 'Posms',
    'orders.estimatedCost': 'Orientējošā cena',
    'orders.createOrder': 'Izveidot pasūtījumu',
    'orders.creating': 'Veido...',
    'orders.deviceInfo': 'Ierīces informācija',
    'orders.brand': 'Ražotājs (Brand)',
    'orders.model': 'Modelis (Model)',
    'orders.color': 'Krāsa (Color)',
    'orders.imei': 'IMEI',
    'orders.serialNumber': 'Sērijas numurs',
    'orders.problemDescription': 'Problēmas apraksts',
    'orders.detailedProblem': 'Detalizēti aprakstiet problēmu...',
    'orders.services': 'Pakalpojumi',
    'orders.parts': 'Rezerves daļas',
    'orders.prepayment': 'Depozīts / Priekšapmaksa',
    'orders.waitingForParts': 'Gaida detaļu',

    // Priority levels
    'priority.low': 'Zems',
    'priority.medium': 'Vidējs',
    'priority.high': 'Augsts',
    'priority.urgent': 'Steidzami',

    // Clients
    'clients.title': 'Klienti',
    'clients.new': 'Jauns klients',
    'clients.list': 'Klientu bāze un mijiedarbības vēsture',
    'clients.fullName': 'Pilns vārds',
    'clients.phone': 'Tālrunis',
    'clients.email': 'E-pasts',
    'clients.trafficSource': 'Avots',
    'clients.createCustomer': 'Izveidot klientu',
    'clients.creating': 'Veido...',
    'clients.searchPlaceholder': 'Meklēt pēc vārda vai tālruņa...',
    'clients.noClientsFound': 'Klienti nav atrasti',
    'clients.contacts': 'Kontakti',
    'clients.orders': 'Pasūtījumi',
    'clients.ltv': 'LTV',

    // Traffic sources
    'source.direct': 'Tieša vēršanās',
    'source.Instagram': 'Instagram',
    'source.Google': 'Google',
    'source.Yandex': 'Yandex',
    'source.Facebook': 'Facebook',
    'source.referral': 'Ieteikums',
    'source.other': 'Cits',

    // Inventory
    'inventory.title': 'Noliktava',
    'inventory.new': 'Jauna rezerves daļa',
    'inventory.partName': 'Rezerves daļas nosaukums',
    'inventory.sku': 'SKU',
    'inventory.quantity': 'Daudzums',
    'inventory.unitCost': 'Pašizmaksa',
    'inventory.location': 'Atrašanās vieta',
    'inventory.supplier': 'Piegādātājs',
    'inventory.movement': 'Kustība',
    'inventory.audit': 'Inventarizācija',

    // Suppliers
    'suppliers.title': 'Piegādātāji',
    'suppliers.new': 'Jauns piegādātājs',
    'suppliers.name': 'Piegādātāja nosaukums',
    'suppliers.contactPerson': 'Kontaktpersona',
    'suppliers.phone': 'Tālrunis',
    'suppliers.email': 'E-pasts',
    'suppliers.notes': 'Piezīmes',
    'suppliers.create': 'Izveidot piegādātāju',
    'suppliers.creating': 'Veido...',
    'suppliers.noSuppliers': 'Nav piegādātāju',
    'suppliers.management': 'Piegādātāju pārvaldība',

    // Settings
    'settings.title': 'Sistēmas iestatījumi',
    'settings.company': 'Uzņēmuma profils',
    'settings.services': 'Pakalpojumu katalogs',
    'settings.suppliers': 'Piegādātāji',
    'settings.team': 'Komanda',
    'settings.permissions': 'Piekļuves tiesības',
    'settings.sources': 'Līdu avoti',
    'settings.templates': 'Dokumentu sagataves',
    'settings.logs': 'Aktivitāšu žurnāls',
    'settings.export': 'Datu eksports',
    'settings.language': 'Valoda',

    // Auth
    'auth.login': 'Ieiet',
    'auth.email': 'E-pasts',
    'auth.password': 'Parole',
    'auth.signIn': 'Ieiet',
    'auth.signOut': 'Iziet',

    // Messages
    'messages.success': 'Veiksmīgi',
    'messages.error': 'Kļūda',
    'messages.required': 'Obligāts lauks',
    'messages.savedSuccessfully': 'Veiksmīgi saglabāts',
    'messages.deletedSuccessfully': 'Veiksmīgi izdzēsts',
    'messages.createdSuccessfully': 'Veiksmīgi izveidots',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'ru' || saved === 'lv') ? saved : 'ru';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
