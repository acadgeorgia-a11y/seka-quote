import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { NewQuotePage } from './pages/NewQuotePage';
import { QuotesPage } from './pages/QuotesPage';
import { QuoteDetailPage } from './pages/QuoteDetailPage';
import { AdminPage } from './pages/AdminPage';
import { CsPage } from './pages/CsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminRatesLocal } from './features/admin/AdminRatesLocal';
import { AdminRatesLongDistance } from './features/admin/AdminRatesLongDistance';
import { AdminRatesAddons } from './features/admin/AdminRatesAddons';
import { AdminSettings } from './features/admin/AdminSettings';
import { AdminAgents } from './features/admin/AdminAgents';
import { AdminTolls } from './features/admin/AdminTolls';
import { AdminCsReps } from './features/admin/AdminCsReps';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <Navigate to="/new-quote" replace /> },
      { path: 'new-quote', element: <NewQuotePage /> },
      { path: 'quotes', element: <QuotesPage /> },
      { path: 'quotes/:quoteCode', element: <QuoteDetailPage /> },
      { path: 'cs', element: <CsPage /> },
      {
        path: 'admin',
        element: <AdminPage />,
        children: [
          { index: true, element: <Navigate to="rates/local" replace /> },
          { path: 'rates/local', element: <AdminRatesLocal /> },
          { path: 'rates/long-distance', element: <AdminRatesLongDistance /> },
          { path: 'rates/addons', element: <AdminRatesAddons /> },
          { path: 'settings', element: <AdminSettings /> },
          { path: 'agents', element: <AdminAgents /> },
          { path: 'tolls', element: <AdminTolls /> },
          { path: 'cs-reps', element: <AdminCsReps /> },
        ],
      },
    ],
  },
]);
