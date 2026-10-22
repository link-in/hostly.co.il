import { Check } from 'lucide-react'
import type { PreviewModel } from '@/lib/landingBuilder/selectors'
import { BookingWidget } from './booking/BookingWidget'
import { BOOKING_THEMES } from './booking/bookingTheme'
import { GalleryLightbox, GalleryThumb } from './shared/gallery/GalleryLightbox'
import { TemplateImage } from './shared/TemplateImage'

const NAV_LINKS = ['הנכס', 'מתקנים', 'גלריה', 'מיקום']

function Header({ siteTitle }: { siteTitle: string }) {
  return (
    <header className="flex items-center justify-between px-6 py-6 @3xl:px-12">
      <span className="text-lg font-semibold tracking-tight">{siteTitle}</span>
      <nav className="hidden items-center gap-8 text-sm text-slate-500 @3xl:flex">
        {NAV_LINKS.map((link) => (
          <span key={link}>{link}</span>
        ))}
      </nav>
      <span className="rounded-full bg-slate-900 px-3.5 py-2 text-sm font-medium text-white">הזמינו עכשיו</span>
    </header>
  )
}

function Hero({ model }: { model: PreviewModel }) {
  return (
    <section className="px-6 @3xl:px-12">
      <p className="text-xs font-medium tracking-[0.2em] text-slate-400">{model.city || 'הזמנה ישירה'}</p>
      <h1 className="mt-2.5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight @3xl:text-6xl">
        {model.heroTitle}
      </h1>
      <p className="mt-3.5 max-w-2xl text-base leading-7 text-slate-500 @3xl:text-lg">{model.heroSubtitle}</p>
      <TemplateImage image={model.coverImage} className="mt-8 aspect-[4/3] w-full rounded-2xl @3xl:aspect-[21/9]" />
    </section>
  )
}

function Details({ model }: { model: PreviewModel }) {
  return (
    <section className="grid gap-10 px-6 py-12 @3xl:grid-cols-[minmax(0,1fr)_360px] @3xl:px-12 @3xl:py-16">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">על המקום</h2>
        <p className="mt-3.5 whitespace-pre-line leading-8 text-slate-600">{model.description}</p>
        <h3 className="mt-10 text-sm font-semibold">מה יש במקום</h3>
        <ul className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-2.5 @3xl:grid-cols-3">
          {model.amenities.map((amenity) => (
            <li key={amenity} className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="size-4 shrink-0 text-slate-900" aria-hidden />
              {amenity}
            </li>
          ))}
        </ul>
      </div>
      <div className="self-start @3xl:sticky @3xl:top-6">
        <BookingWidget booking={model.booking} contact={model.contact} siteTitle={model.siteTitle} theme={BOOKING_THEMES['minimalist-modern']} />
      </div>
    </section>
  )
}

function Gallery({ model }: { model: PreviewModel }) {
  if (model.galleryImages.length === 0) return null
  return (
    <section className="px-6 pb-16 @3xl:px-12">
      <h2 className="text-2xl font-semibold tracking-tight">גלריה</h2>
      <GalleryLightbox images={model.galleryImages}>
        <div className="mt-6 grid grid-cols-2 gap-2 @3xl:grid-cols-3">
          {model.galleryImages.map((image, index) => (
            <GalleryThumb key={image.id} image={image} index={index} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </GalleryLightbox>
    </section>
  )
}

export default function MinimalistModernTemplate({ model }: { model: PreviewModel }) {
  return (
    <div className="min-h-full bg-white text-slate-900">
      <Header siteTitle={model.siteTitle} />
      <Hero model={model} />
      <Details model={model} />
      <Gallery model={model} />
      <footer className="border-t border-slate-100 px-6 py-8 text-sm text-slate-400 @3xl:px-12">
        © {model.siteTitle} · אתר הזמנות ישירות מבית Hostly
      </footer>
    </div>
  )
}
