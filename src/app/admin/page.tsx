import React from 'react'
import { fetchDashboardMetrics } from '@/actions/adminDashboardActions'
import AdminDashboardClient from './AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // Pre-fetch metrics on the server before loading the page
  const initialMetrics = await fetchDashboardMetrics()

  return <AdminDashboardClient initialMetrics={initialMetrics} />
}
