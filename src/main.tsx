import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { loadNetwork } from './network/bootstrap'
import { createExplorer } from './stores/explorer'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
void loadNetwork().then(({ layers, source }) => {
  root.render(
    <StrictMode>
      <App store={createExplorer(layers)} source={source} />
    </StrictMode>
  )
})
