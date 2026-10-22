import { Leaf } from 'lucide-react'
import type { PreviewModel } from '@/lib/landingBuilder/selectors'
import { BookingWidget } from './booking/BookingWidget'
import { BOOKING_THEMES } from './booking/bookingTheme'
import { GalleryLightbox, GalleryThumb } from './shared/gallery/GalleryLightbox'
import { TemplateImage } from './shared/TemplateImage'

function Hero({ model }: { model: PreviewModel }) {
  return (
    <section className="relative">
      <TemplateImage image={model.coverImage} className="h-[520px] w-full @3xl:h-[640px]" />
      <div className="absolute inset-0 bg-linear-to-b from-stone-900/50 via-stone-900/10 to-stone-900/75" aria-hidden />
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-6 text-white @3xl:px-12">
        <span className="font-serif text-xl">{model.siteTitle}</span>
        <span className="rounded-full bg-white/15 px-3.5 py-2 text-sm backdrop-blur">בדיקת זמינות</span>
      </header>
      <div className="absolute inset-x-0 bottom-0 px-6 pb-10 text-center text-white @3xl:pb-16">
        {model.city && <p className="text-sm tracking-wide text-amber-100">{model.city}</p>}
        <h1 className="mx-auto mt-2 max-w-3xl font-serif text-4xl leading-tight @3xl:text-6xl">{model.heroTitle}</h1>
        <p className="mx-auto mt-3.5 max-w-xl text-base text-white/85 @3xl:text-lg">{model.heroSubtitle}</p>
      </div>
    </section>
  )
}

function Welcome({ model }: { model: PreviewModel }) {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 @3xl:grid-cols-[minmax(0,1fr)_380px] @3xl:px-12 @3xl:py-20">
      <div>
        <p className="font-serif text-sm text-amber-700">ברוכים הבאים</p>
        <h2 className="mt-1 font-serif text-3xl text-stone-900">הבית שלכם בחופשה</h2>
        <p className="mt-6 whitespace-pre-line text-[17px] leading-8 text-stone-600">{model.description}</p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {model.amenities.map((amenity) => (
            <li
              key={amenity}
              className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm text-stone-700 ring-1 ring-amber-200/70"
            >
              <Leaf className="size-3.5 text-amber-600" aria-hidden />
              {amenity}
            </li>
          ))}
        </ul>
      </div>
      <div className="self-start @3xl:sticky @3xl:top-6">
        <BookingWidget booking={model.booking} contact={model.contact} siteTitle={model.siteTitle} theme={BOOKING_THEMES['cozy-warm']} />
      </div>
    </section>
  )
}

function Gallery({ model }: { model: PreviewModel }) {
  if (model.galleryImages.length === 0) return null
  return (
    <section className="px-6 pb-16 @3xl:px-12">
      <GalleryLightbox images={model.galleryImages}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2.5 @3xl:grid-cols-4">
          {model.galleryImages.map((image, index) => (
            <GalleryThumb
              key={image.id}
              image={image}
              index={index}
              className={`rounded-3xl ${index === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'}`}
            />
          ))}
        </div>
      </GalleryLightbox>
    </section>
  )
}

export default function CozyWarmTemplate({ model }: { model: PreviewModel }) {
  return (
    <div className="min-h-full bg-amber-50/60 text-stone-800">
      <Hero model={model} />
      <Welcome model={model} />
      <Gallery model={model} />
      <footer className="bg-stone-900 px-6 py-10 text-center font-serif text-stone-300">
        {model.siteTitle} · מחכים לכם
      </footer>
    </div>
  )
}
