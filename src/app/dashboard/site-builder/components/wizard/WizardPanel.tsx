import WizardHeader from './WizardHeader'
import WizardStepper from './WizardStepper'
import WizardFooter from './WizardFooter'

export default function WizardPanel() {
  return (
    <aside className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/70 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
      <WizardHeader />
      <div className="grow overflow-y-auto px-6 pb-6">
        <WizardStepper />
      </div>
      <WizardFooter />
    </aside>
  )
}
