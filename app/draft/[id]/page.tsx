/**
 * GET /draft/:id
 * Draft simulator page
 *
 * Server component that fetches initial draft state and passes to client component
 */

import { notFound } from 'next/navigation'
import DraftSimulator from './draft-simulator'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Fetch draft session state
 */
async function getDraftState(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/draft/${id}`,
      {
        cache: 'no-store', // Always fetch fresh draft state
      }
    )

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[DraftPage] Error fetching draft:', error)
    return null
  }
}

/**
 * Draft page - loads initial state and renders client simulator
 */
export default async function DraftPage({ params }: PageProps) {
  const { id } = await params
  const draftState = await getDraftState(id)

  if (!draftState) {
    notFound()
  }

  return <DraftSimulator id={id} initialState={draftState} />
}
