import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import QRAuth from "./pages/QRAuth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Payment from "./pages/Payment";
import Admin from "./pages/Admin";
import Projects from "./pages/Projects";
import StackChat from "./pages/StackChat";
import About from "./pages/About";
import CodeIDE from "./pages/CodeIDE";
import Marketing from "./pages/Marketing";
import Feedback from "./pages/Feedback";
import Announcements from "./pages/Announcements";
import WebsiteControls from "./pages/WebsiteControls";
import NotFound from "./pages/NotFound";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminProjectManagement from "./pages/AdminProjectManagement";
import SwipeIn from "./pages/SwipeIn";
import Internal from "./pages/Internal";
import { SwipeGate } from "./components/SwipeGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/qr" element={<QRAuth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/admin" element={<SwipeGate><Admin /></SwipeGate>} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/stack-chat" element={<SwipeGate><StackChat /></SwipeGate>} />
          <Route path="/about" element={<About />} />
          <Route path="/ide" element={<SwipeGate><CodeIDE /></SwipeGate>} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/website-controls" element={<WebsiteControls />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/admin/projects" element={<SwipeGate><AdminProjectManagement /></SwipeGate>} />
          <Route path="/internal" element={<Internal />} />
          <Route path="/swipe-in" element={<SwipeIn />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
