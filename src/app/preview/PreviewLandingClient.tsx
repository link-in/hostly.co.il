'use client'

import HeroSection from './components/HeroSection'
import ProblemSolution from './components/ProblemSolution'
import FeaturesGrid from './components/FeaturesGrid'
import DataMarketing from './components/DataMarketing'
import Testimonials from './components/Testimonials'
import FinalCTA from './components/FinalCTA'

export default function PreviewLandingClient() {
  return (
    <div style={{ direction: 'rtl' }}>
      <HeroSection />
      <ProblemSolution />
      <FeaturesGrid />
      <DataMarketing />
      <Testimonials />
      <FinalCTA />
    </div>
  )
}
