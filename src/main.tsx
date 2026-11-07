/// <reference types="vite/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Display } from './presentation/Display'
import { openPresentation } from './presentation/session'
import './styles.css'
import './presentation/display.css'

const root = createRoot(document.getElementById('root')!)
const admin = /^\/admin\/?$/.test(location.pathname)
void openPresentation(admin).then((session) => {
  root.render(
    <StrictMode>{admin ? <App session={session} /> : <Display session={session} />}</StrictMode>
  )
  import.meta.hot?.dispose(() => {
    session.close()
    root.unmount()
  })
})
