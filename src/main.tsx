import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// aplica o tema antes do primeiro render para não piscar em branco/escuro
const tema = localStorage.getItem('tema') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'claro')
document.documentElement.classList.toggle('dark', tema === 'dark')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
