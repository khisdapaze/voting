import { GoogleOAuthProvider } from '@react-oauth/google';
import HomePage from './pages/HomePage.tsx';
import { ROUTES } from './routes.ts';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PollDetailPage from './pages/PollDetailPage.tsx';
import { queryClient } from './utils/queryClient.ts';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthenticationProvider } from './contexts/AuthenticationContext.tsx';
import CreatePollPage from './pages/CreatePollPage.tsx';
import SharePollPage from './pages/SharePollPage.tsx';
import ManagePollPage from './pages/ManagePollPage.tsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const App = () => {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthenticationProvider>
                <QueryClientProvider client={queryClient}>
                    <Router>
                        <Routes>
                            <Route path={ROUTES.HOME} element={<HomePage />} />
                            <Route path={ROUTES.POLL_DETAIL} element={<PollDetailPage />} />
                            <Route path={ROUTES.POLL_CREATE} element={<CreatePollPage />} />
                            <Route path={ROUTES.POLL_SHARE} element={<SharePollPage />} />
                            <Route path={ROUTES.POLL_MANAGE} element={<ManagePollPage />} />
                        </Routes>
                    </Router>
                </QueryClientProvider>
            </AuthenticationProvider>
        </GoogleOAuthProvider>
    );
};

export default App;
