import { redirect } from 'next/navigation'

export default async function AirbnbSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/onboarding/${id}`)
}
