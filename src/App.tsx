import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainPage from './atomic/pages/MainPage/MainPage.tsx'
import UserPage from './atomic/pages/UserPage/UserPage.tsx'
import OperatorPage from './atomic/pages/OperatorPage/OperatorPage.tsx'
import ResultsPage from './atomic/pages/ResultsPage/ResultsPage.tsx'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/user" element={<UserPage />} />
                <Route path="/operator" element={<OperatorPage />} />
                <Route path="/results" element={<ResultsPage />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
