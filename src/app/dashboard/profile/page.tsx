import React from 'react'
import { SessionProvider } from '../SessionProvider'
import ProfileClient from './ProfileClient'

export const metadata = {
  title: 'איזור אישי | דשבורד',
}

const ProfilePage = () => {
  return (
    <SessionProvider>
      <ProfileClient />
    </SessionProvider>
  )
}

export default ProfilePage
