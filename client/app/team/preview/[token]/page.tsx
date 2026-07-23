import ClientPreviewPublic from '@/components/team/planning/ClientPreviewPublic'

export default function TeamPreviewPage({ params }: { params: { token: string } }) {
  return <ClientPreviewPublic token={params.token} />
}