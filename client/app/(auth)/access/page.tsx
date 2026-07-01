import { redirect } from 'next/navigation'

export default function AccessRedirect() {
  redirect('/access-blocked')
}