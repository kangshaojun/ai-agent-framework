import '@/styles/globals.css'
import React from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <head>
        <title>My AI Agent Framework</title>
        <meta name="referrer" content="origin" />
        <meta
          name="description"
          content="front ui library react next.js."
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className='bg-neutral-4'>
        {children}
      </body>
    </html>
  )
}