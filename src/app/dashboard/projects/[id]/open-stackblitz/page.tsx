import { redirect } from 'next/navigation'

/**
 * Redirect to the dedicated open-stackblitz page (no project tabs).
 * Keeps a single place for the StackBlitz opener and avoids nested project layout.
 */
export default async function ProjectOpenStackBlitzRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/open-stackblitz/${id}`)
}
