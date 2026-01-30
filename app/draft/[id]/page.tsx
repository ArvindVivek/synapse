/**
 * GET /draft/:id
 * Draft simulator page
 *
 * Server component that passes draft ID and side to client simulator
 */

import DraftSimulator from './draft-simulator'

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    userSide?: string
  }>
}

/**
 * Draft page - renders client simulator with initial props
 * State is managed entirely client-side via Zustand
 */
export default async function DraftPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { userSide } = await searchParams
  const initialSide = userSide === 'red' ? 'red' : 'blue'

  return <DraftSimulator draftId={id} initialSide={initialSide} />
}
