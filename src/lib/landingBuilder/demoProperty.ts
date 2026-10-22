import type { PropertyContent } from './types'

const unsplash = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1600&q=80`

/** Returned by the import for demo users (`isDemo`), and used as a fully populated test fixture. */
export const DEMO_PROPERTY: PropertyContent = {
  propertyId: 'demo-306559',
  roomId: 'demo-638851',
  name: 'נוף הרים בדפנה',
  headline: 'צימר זוגי בין פלגי הדן אל מול נופי החרמון',
  description:
    'צימר מעוצב עם ג׳קוזי ספא, מרפסת פרטית ונוף פתוח להרים. חמש דקות הליכה משמורת הדן, ' +
    'ארוחת בוקר עשירה מוגשת עד הדלת. מושלם לזוגות שמחפשים שקט, טבע ופינוק.',
  city: 'קיבוץ דפנה',
  amenities: ['ג׳קוזי ספא', 'Wi-Fi מהיר', 'מטבחון מאובזר', 'חניה פרטית', 'מרפסת נוף', 'ארוחת בוקר'],
  images: [
    { url: unsplash('photo-1566073771259-6a8506099945'), alt: 'בריכה ונוף' },
    { url: unsplash('photo-1505693416388-ac5ce068fe85'), alt: 'חדר שינה' },
    { url: unsplash('photo-1522708323590-d24dbb6b0267'), alt: 'סלון' },
    { url: unsplash('photo-1502672260266-1c1ef2d93688'), alt: 'פינת ישיבה' },
    { url: unsplash('photo-1560448204-e02f11c3d0e2'), alt: 'מטבחון' },
  ],
  maxGuests: 2,
  basePrice: 950,
  currency: 'ILS',
}
