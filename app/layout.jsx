import './globals.css'

export const metadata = {
  title: 'TODO Tracker',
  description: 'Corporate TODO tracker',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
