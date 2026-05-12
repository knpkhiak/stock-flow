import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Ideas from "./pages/Ideas";
import IdeaDetail from "./pages/IdeaDetail";
import Shared from "./pages/Shared";
import SharedDetail from "./pages/SharedDetail";
import Board from "./pages/Board";
import BoardNew from "./pages/BoardNew";
import BoardDetail from "./pages/BoardDetail";
import BoardEdit from "./pages/BoardEdit";
import Trades from "./pages/Trades";
import Assets from "./pages/Assets";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";
import Invite from "./pages/Invite";
import Admin from "./pages/Admin";
import AdminRoute from "@/components/AdminRoute";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/invite" element={<Invite />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/ideas/:id" element={<IdeaDetail />} />
            <Route path="/shared" element={<Shared />} />
            <Route path="/shared/:id" element={<SharedDetail />} />
            <Route path="/board" element={<Board />} />
            <Route path="/board/new" element={<BoardNew />} />
            <Route path="/board/:id" element={<BoardDetail />} />
            <Route path="/board/:id/edit" element={<BoardEdit />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
