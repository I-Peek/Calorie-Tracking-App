import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { ToastProvider } from './components/ui/Toast'
import { SelectedDateProvider } from './hooks/selectedDate'
import { ThemeProvider } from './hooks/theme'
import { useProfile } from './hooks/data'
import { BottomNav } from './components/BottomNav'
import { UpdatePrompt } from './components/UpdatePrompt'
import { DiaryPage } from './pages/DiaryPage'
import { AddFoodPage } from './pages/AddFoodPage'

// Less frequently used screens are loaded on demand (all files are precached for offline use).
const FoodEditorPage = lazy(() => import('./pages/FoodEditorPage').then((m) => ({ default: m.FoodEditorPage })))
const RecipeEditorPage = lazy(() => import('./pages/RecipeEditorPage').then((m) => ({ default: m.RecipeEditorPage })))
const FastingPage = lazy(() => import('./pages/FastingPage').then((m) => ({ default: m.FastingPage })))
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((m) => ({ default: m.GoalsPage })))
const MyFoodsPage = lazy(() => import('./pages/MyFoodsPage').then((m) => ({ default: m.MyFoodsPage })))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SelectedDateProvider>
          <Shell />
          <UpdatePrompt />
        </SelectedDateProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

function Shell() {
  const profile = useProfile()

  if (profile === undefined) return <Splash />

  if (profile === null)
    return (
      <Suspense fallback={<Splash />}>
        <OnboardingPage />
      </Suspense>
    )

  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<DiaryPage profile={profile} />} />
          <Route path="/add" element={<AddFoodPage />} />
          <Route path="/food/new" element={<FoodEditorPage />} />
          <Route path="/food/:id" element={<FoodEditorPage />} />
          <Route path="/recipe/new" element={<RecipeEditorPage />} />
          <Route path="/recipe/:id" element={<RecipeEditorPage />} />
          <Route path="/fasting" element={<FastingPage profile={profile} />} />
          <Route path="/progress" element={<ProgressPage profile={profile} />} />
          <Route path="/profile" element={<ProfilePage profile={profile} />} />
          <Route path="/profile/goals" element={<GoalsPage profile={profile} />} />
          <Route path="/foods" element={<MyFoodsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
      <BottomNav profile={profile} />
    </>
  )
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <img src="./icons/favicon.svg" alt="" className="size-16 animate-pulse" />
    </div>
  )
}
