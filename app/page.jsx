import dynamic from 'next/dynamic'

// Disable SSR — the app uses browser APIs (localStorage for audio/emails)
// and is fully interactive, so client-only rendering is the right choice.
const App = dynamic(() => import('@/components/App'), { ssr: false })

export default function Page() {
  return <App />
}
