import { Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import Painel from './pages/Painel'
import Calendario from './pages/Calendario'
import Cronograma from './pages/Cronograma'
import Historico from './pages/Historico'
import Compras from './pages/Compras'
import Financeiro from './pages/Financeiro'
import Assembleias from './pages/Assembleias'
import Prestadores from './pages/Prestadores'
import Documentos from './pages/Documentos'
import DadosAbertos from './pages/DadosAbertos'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Painel />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="cronograma" element={<Cronograma />} />
        <Route path="historico" element={<Historico />} />
        <Route path="compras" element={<Compras />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="assembleias" element={<Assembleias />} />
        <Route path="prestadores" element={<Prestadores />} />
        <Route path="documentos" element={<Documentos />} />
        <Route path="dados-abertos" element={<DadosAbertos />} />
        <Route path="*" element={<Painel />} />
      </Route>
    </Routes>
  )
}
