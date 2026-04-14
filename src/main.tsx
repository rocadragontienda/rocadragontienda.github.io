import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ConsultaPuntos from './pages/ConsultaPuntos'
import AdminLayout from './pages/AdminLayout'
import './App.css'

const path          = window.location.pathname
const isPublicRoute = path.startsWith('/rocapuntos')
const isAdminRoute  = path.startsWith('/admin')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isPublicRoute ? <ConsultaPuntos /> : isAdminRoute ? <AdminLayout /> : <App />}
  </React.StrictMode>,
)
