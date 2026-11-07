import { Rubik } from 'next/font/google'

const siteFont = Rubik({ subsets: ['latin', 'hebrew'], variable: '--font-site', display: 'swap' })

/** Defines `--font-site`; `.site-fonts` in landing-reset.css maps it onto Tailwind's `font-sans` and `font-serif`. */
export const SITE_FONT_CLASSES = `${siteFont.variable} site-fonts`
