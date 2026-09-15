import { useState } from 'react';
import Layout, { type PageKey } from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import FoodItems from '@/components/FoodItems';
import SalesData from '@/components/SalesData';
import Prediction from '@/components/Prediction';

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'food-items' && <FoodItems />}
      {page === 'sales-data' && <SalesData />}
      {page === 'prediction' && <Prediction />}
    </Layout>
  );
}

export default App;
