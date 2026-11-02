import WizardHeader from './WizardHeader'
import WizardStepper from './WizardStepper'
import WizardFooter from './WizardFooter'

export default function WizardPanel() {
  return (
    <aside className="flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/70 sm:rounded-3xl lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
      <WizardHeader />
      <div className="grow overflow-y-auto px-3.5 pb-4 sm:px-6 sm:pb-6">
        <WizardStepper />
      </div>
      <WizardFooter />
    </aside>
  )
}
