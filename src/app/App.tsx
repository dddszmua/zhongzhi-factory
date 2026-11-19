import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { RetiredServicePage } from '@/pages/RetiredServicePage'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireAuth } from '@/auth/RequireAuth'
import { SupplierLayout } from '@/components/layout/SupplierLayout'
import { HomePage } from '@/pages/HomePage'
import { DemandPage } from '@/pages/DemandPage'
import { MarketPage } from '@/pages/MarketPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { MessagesPage } from '@/pages/MessagesPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SupplierDashboardPage } from '@/pages/supplier/DashboardPage'
import { SupplierProductsPage } from '@/pages/supplier/ProductsPage'
import { SupplierCreatePage } from '@/pages/supplier/CreatePage'
import { SupplierCreatePage as LegacySupplierCreatePage } from '@/pages/supplier/LegacyCreatePage'
import { SupplierTrialPage } from '@/pages/supplier/TrialPage'
import { EditProductPage } from '@/pages/supplier/EditProductPage'
import { GeneratedCodePage } from '@/pages/supplier/GeneratedCodePage'
import { ClinicalEvaluationPage } from '@/pages/supplier/ClinicalEvaluationPage'
import { ClinicalReviewPage } from '@/pages/supplier/ClinicalReviewPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/mcp-market" element={<RetiredServicePage />} />
          <Route path="/mcp-services/:id" element={<RetiredServicePage />} />
          <Route path="/demand" element={<DemandPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
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
            <Route path="products/:id/edit" element={<EditProductPage />} />
            <Route path="products/:id/code" element={<GeneratedCodePage />} />
            <Route path="create" element={<SupplierCreatePage />} />
            <Route path="create/legacy" element={<LegacySupplierCreatePage />} />
            <Route path="create/task/:taskId" element={<SupplierCreatePage />} />
            <Route path="trial" element={<SupplierTrialPage />} />
            <Route path="review" element={<ClinicalReviewPage />} />
            <Route path="mcp" element={<RetiredServicePage />} />
            <Route path="mcp/create" element={<RetiredServicePage />} />
            <Route path="mcp/jobs/:jobId" element={<RetiredServicePage />} />
            <Route path="evaluation" element={<ClinicalEvaluationPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
    </AuthProvider>
  )
}
