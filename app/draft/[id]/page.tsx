/**
 * GET /draft/:id
 * Draft simulator page
 *
 * Server component that passes draft ID to client simulator
 */

import DraftSimulator from './draft-simulator'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Draft page - renders client simulator with initial props
 * State is managed entirely client-side via Zustand
 */
export default async function DraftPage({ params }: PageProps) {
  const { id } = await params

  return <DraftSimulator draftId={id} />
}
