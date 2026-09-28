import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireAuth } from '@/auth/RequireAuth'
import { SupplierLayout } from '@/components/layout/SupplierLayout'
import { HomePage } from '@/pages/HomePage'
import { MarketPage } from '@/pages/MarketPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SupplierDashboardPage } from '@/pages/supplier/DashboardPage'
import { SupplierProductsPage } from '@/pages/supplier/ProductsPage'
import { SupplierCreatePage } from '@/pages/supplier/CreatePage'
import { SupplierTrialPage } from '@/pages/supplier/TrialPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/supplier"
            element={
              <RequireAuth>
                <SupplierLayout />
              </RequireAuth>
            }
          >
            <Route index element={<SupplierDashboardPage />} />
            <Route path="products" element={<SupplierProductsPage />} />
            <Route path="create" element={<SupplierCreatePage />} />
            <Route path="trial" element={<SupplierTrialPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
    </AuthProvider>
  )
}
