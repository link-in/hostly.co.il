import type { DashboardProvider, PriceRule, Reservation, RoomPrice } from '@/lib/dashboard/types'

/**
 * Mock Dashboard Provider - Demo Data
 * עם נתונים ריאליסטיים למשתמשי דמו
 */

const reservations: Reservation[] = [
  // ינואר 2026
  {
    id: 'res_1001',
    guestName: 'דינה כהן',
    checkIn: '2026-01-10',
    checkOut: '2026-01-13',
    nights: 3,
    total: 2100,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2025-12-20',
  },
  {
    id: 'res_1002',
    guestName: 'משה לוי',
    checkIn: '2026-01-17',
    checkOut: '2026-01-20',
    nights: 3,
    total: 2400,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2025-12-28',
  },
  {
    id: 'res_1003',
    guestName: 'שרה אברהם',
    checkIn: '2026-01-24',
    checkOut: '2026-01-26',
    nights: 2,
    total: 1600,
    status: 'confirmed',
    source: 'Direct',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-01-05',
  },
  
  // פברואר 2026
  {
    id: 'res_1004',
    guestName: 'דוד כהן',
    checkIn: '2026-02-06',
    checkOut: '2026-02-09',
    nights: 3,
    total: 2250,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-01-15',
  },
  {
    id: 'res_1005',
    guestName: 'רונית מזרחי',
    checkIn: '2026-02-14',
    checkOut: '2026-02-16',
    nights: 2,
    total: 1800,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-01-28',
  },
  {
    id: 'res_1006',
    guestName: 'יוסי ברק',
    checkIn: '2026-02-21',
    checkOut: '2026-02-23',
    nights: 2,
    total: 1700,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-02-03',
  },
  {
    id: 'res_1007',
    guestName: 'מיכל גולן',
    checkIn: '2026-02-28',
    checkOut: '2026-03-02',
    nights: 2,
    total: 1650,
    status: 'pending',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-02-18',
  },
  
  // מרץ 2026
  {
    id: 'res_1008',
    guestName: 'אלי שמעון',
    checkIn: '2026-03-06',
    checkOut: '2026-03-09',
    nights: 3,
    total: 2400,
    status: 'confirmed',
    source: 'Direct',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-02-15',
  },
  {
    id: 'res_1009',
    guestName: 'נועה פרידמן',
    checkIn: '2026-03-13',
    checkOut: '2026-03-16',
    nights: 3,
    total: 2550,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-02-20',
  },
  {
    id: 'res_1010',
    guestName: 'אורי אלון',
    checkIn: '2026-03-20',
    checkOut: '2026-03-23',
    nights: 3,
    total: 2700,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-03-01',
  },
  {
    id: 'res_1011',
    guestName: 'טל בן דוד',
    checkIn: '2026-03-27',
    checkOut: '2026-03-30',
    nights: 3,
    total: 2850,
    status: 'pending',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-03-10',
  },
  
  // אפריל 2026 (פסח)
  {
    id: 'res_1012',
    guestName: 'דני רוזן',
    checkIn: '2026-04-03',
    checkOut: '2026-04-06',
    nights: 3,
    total: 3300,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-03-05',
  },
  {
    id: 'res_1013',
    guestName: 'ליאת מור',
    checkIn: '2026-04-10',
    checkOut: '2026-04-14',
    nights: 4,
    total: 4800,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-03-15',
  },
  {
    id: 'res_1014',
    guestName: 'גיא שפירא',
    checkIn: '2026-04-18',
    checkOut: '2026-04-21',
    nights: 3,
    total: 3600,
    status: 'confirmed',
    source: 'Direct',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-03-28',
  },
  {
    id: 'res_1015',
    guestName: 'הדס כרמל',
    checkIn: '2026-04-25',
    checkOut: '2026-04-27',
    nights: 2,
    total: 2200,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-04-05',
  },
  
  // מאי 2026
  {
    id: 'res_1016',
    guestName: 'רועי אזולאי',
    checkIn: '2026-05-02',
    checkOut: '2026-05-04',
    nights: 2,
    total: 1900,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-04-12',
  },
  {
    id: 'res_1017',
    guestName: 'שירה ברוך',
    checkIn: '2026-05-09',
    checkOut: '2026-05-11',
    nights: 2,
    total: 1850,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-04-20',
  },
  {
    id: 'res_1018',
    guestName: 'עומר דהן',
    checkIn: '2026-05-16',
    checkOut: '2026-05-19',
    nights: 3,
    total: 2700,
    status: 'pending',
    source: 'Direct',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-04-28',
  },
  {
    id: 'res_1019',
    guestName: 'מאיה חיים',
    checkIn: '2026-05-23',
    checkOut: '2026-05-26',
    nights: 3,
    total: 2850,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-05-05',
  },
  
  // יוני 2026
  {
    id: 'res_1020',
    guestName: 'יובל גרין',
    checkIn: '2026-06-05',
    checkOut: '2026-06-08',
    nights: 3,
    total: 2850,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-05-15',
  },
  {
    id: 'res_1021',
    guestName: 'תמר וינר',
    checkIn: '2026-06-13',
    checkOut: '2026-06-16',
    nights: 3,
    total: 2700,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-05-25',
  },
  {
    id: 'res_1022',
    guestName: 'ניר אטיאס',
    checkIn: '2026-06-20',
    checkOut: '2026-06-22',
    nights: 2,
    total: 1800,
    status: 'confirmed',
    source: 'Direct',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-06-01',
  },
  {
    id: 'res_1023',
    guestName: 'איריס סלע',
    checkIn: '2026-06-27',
    checkOut: '2026-06-30',
    nights: 3,
    total: 3000,
    status: 'pending',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-06-10',
  },
  
  // יולי 2026 (קיץ)
  {
    id: 'res_1024',
    guestName: 'אסף זיו',
    checkIn: '2026-07-03',
    checkOut: '2026-07-07',
    nights: 4,
    total: 4400,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-06-15',
  },
  {
    id: 'res_1025',
    guestName: 'רחל מנור',
    checkIn: '2026-07-11',
    checkOut: '2026-07-14',
    nights: 3,
    total: 3450,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-06-20',
  },
  {
    id: 'res_1026',
    guestName: 'בן שלום',
    checkIn: '2026-07-18',
    checkOut: '2026-07-21',
    nights: 3,
    total: 3600,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-06-28',
  },
  {
    id: 'res_1027',
    guestName: 'ענת גבע',
    checkIn: '2026-07-25',
    checkOut: '2026-07-28',
    nights: 3,
    total: 3450,
    status: 'confirmed',
    source: 'Direct',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-07-05',
  },
  
  // אוגוסט 2026
  {
    id: 'res_1028',
    guestName: 'עידו ברון',
    checkIn: '2026-08-01',
    checkOut: '2026-08-04',
    nights: 3,
    total: 3750,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-07-10',
  },
  {
    id: 'res_1029',
    guestName: 'מור אלמוג',
    checkIn: '2026-08-08',
    checkOut: '2026-08-11',
    nights: 3,
    total: 3600,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-07-18',
  },
  {
    id: 'res_1030',
    guestName: 'נדב שני',
    checkIn: '2026-08-15',
    checkOut: '2026-08-17',
    nights: 2,
    total: 2400,
    status: 'pending',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-07-28',
  },
  
  // ספטמבר 2026
  {
    id: 'res_1031',
    guestName: 'ליאור כץ',
    checkIn: '2026-09-04',
    checkOut: '2026-09-07',
    nights: 3,
    total: 2700,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-08-15',
  },
  {
    id: 'res_1032',
    guestName: 'דנה ארד',
    checkIn: '2026-09-20',
    checkOut: '2026-09-23',
    nights: 3,
    total: 3150,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-09-01',
  },
  
  // אוקטובר 2026 (חגים)
  {
    id: 'res_1033',
    guestName: 'אייל נחום',
    checkIn: '2026-10-02',
    checkOut: '2026-10-05',
    nights: 3,
    total: 3600,
    status: 'confirmed',
    source: 'Direct',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-09-10',
  },
  {
    id: 'res_1034',
    guestName: 'ורד שטרן',
    checkIn: '2026-10-16',
    checkOut: '2026-10-19',
    nights: 3,
    total: 2850,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-09-25',
  },
  
  // נובמבר 2026
  {
    id: 'res_1035',
    guestName: 'שי לבנון',
    checkIn: '2026-11-06',
    checkOut: '2026-11-09',
    nights: 3,
    total: 2400,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-10-18',
  },
  {
    id: 'res_1036',
    guestName: 'רות אבני',
    checkIn: '2026-11-20',
    checkOut: '2026-11-22',
    nights: 2,
    total: 1700,
    status: 'pending',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-11-05',
  },
  
  // דצמבר 2026 (חורף)
  {
    id: 'res_1037',
    guestName: 'גל סימן טוב',
    checkIn: '2026-12-04',
    checkOut: '2026-12-07',
    nights: 3,
    total: 2550,
    status: 'confirmed',
    source: 'Direct',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-11-15',
  },
  {
    id: 'res_1038',
    guestName: 'עדי רבין',
    checkIn: '2026-12-18',
    checkOut: '2026-12-21',
    nights: 3,
    total: 2700,
    status: 'confirmed',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-11-28',
  },
  {
    id: 'res_1039',
    guestName: 'יעל דגן',
    checkIn: '2026-12-25',
    checkOut: '2026-12-28',
    nights: 3,
    total: 3000,
    status: 'confirmed',
    source: 'Airbnb',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-12-05',
  },
  
  // הזמנה מבוטלת לדוגמה
  {
    id: 'res_1040',
    guestName: 'מיכל אברמוביץ',
    checkIn: '2026-05-01',
    checkOut: '2026-05-03',
    nights: 2,
    total: 1800,
    status: 'cancelled',
    source: 'Booking.com',
    unitName: 'Mountain View Dafna',
    createdAt: '2026-04-10',
  },
]

const pricingRules: PriceRule[] = [
  {
    id: 'price_2001',
    title: 'חורף - ימי חול',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    minNights: 2,
    maxNights: 7,
    pricePerNight: 700,
    isActive: true,
    notes: 'מחיר בסיס לחורף',
  },
  {
    id: 'price_2002',
    title: 'חופשת פסח',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    minNights: 3,
    pricePerNight: 1100,
    isActive: true,
    notes: 'עונת פסח - מחיר פרימיום',
  },
  {
    id: 'price_2003',
    title: 'קיץ - חודשי שיא',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    minNights: 2,
    pricePerNight: 1150,
    isActive: true,
    notes: 'חופשת קיץ - ביקוש גבוה',
  },
  {
    id: 'price_2004',
    title: 'חגי תשרי',
    startDate: '2026-09-14',
    endDate: '2026-10-15',
    minNights: 3,
    pricePerNight: 1050,
    isActive: true,
    notes: 'ראש השנה, יום כיפור, סוכות',
  },
  {
    id: 'price_2005',
    title: 'חנוכה וחורף',
    startDate: '2026-12-01',
    endDate: '2026-12-31',
    minNights: 2,
    pricePerNight: 850,
    isActive: true,
    notes: 'עונת חורף וחנוכה',
  },
]

/**
 * Generate room prices for a full year
 * מחירי לילה ריאליסטיים לשנה שלמה
 */
function generateYearPrices(): RoomPrice[] {
  const prices: RoomPrice[] = []
  const startDate = new Date('2026-01-01')
  const endDate = new Date('2026-12-31')
  
  // Base prices by season
  const seasonalPrices = {
    winter: 700,      // ינואר-מרץ
    spring: 850,      // אפריל-מאי
    summer: 1150,     // יוני-אוגוסט
    fall: 900,        // ספטמבר-נובמבר
    holiday: 1200,    // חגים וסופי שבוע מיוחדים
  }
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const month = d.getMonth() + 1
    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 // שישי-שבת
    
    let basePrice = seasonalPrices.winter
    
    // Seasonal pricing
    if (month >= 1 && month <= 3) {
      basePrice = seasonalPrices.winter
    } else if (month >= 4 && month <= 5) {
      basePrice = seasonalPrices.spring
      // Passover premium
      if (month === 4) {
        basePrice = seasonalPrices.holiday
      }
    } else if (month >= 6 && month <= 8) {
      basePrice = seasonalPrices.summer
    } else if (month >= 9 && month <= 11) {
      basePrice = seasonalPrices.fall
      // High holidays premium
      if (month === 9 || month === 10) {
        basePrice = seasonalPrices.holiday
      }
    } else if (month === 12) {
      basePrice = seasonalPrices.winter + 150 // Hanukkah/winter holidays
    }
    
    // Weekend premium (15% more)
    if (isWeekend) {
      basePrice = Math.round(basePrice * 1.15)
    }
    
    const dateStr = d.toISOString().split('T')[0]
    prices.push({
      date: dateStr,
      price: basePrice,
      roomId: 'demo_room_1',
    })
  }
  
  return prices
}

const roomPrices: RoomPrice[] = generateYearPrices()

export const mockDashboardProvider: DashboardProvider = {
  getReservations: async () => reservations,
  getPricingRules: async () => pricingRules,
  getRoomPrices: async () => roomPrices,
}
