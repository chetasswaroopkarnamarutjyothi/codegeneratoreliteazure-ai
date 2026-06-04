import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SwipeGate } from "./components/SwipeGate";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const QRAuth = lazy(() => import("./pages/QRAuth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Payment = lazy(() => import("./pages/Payment"));
const Admin = lazy(() => import("./pages/Admin"));
const Projects = lazy(() => import("./pages/Projects"));
const StackChat = lazy(() => import("./pages/StackChat"));
const About = lazy(() => import("./pages/About"));
const CodeIDE = lazy(() => import("./pages/CodeIDE"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Announcements = lazy(() => import("./pages/Announcements"));
const WebsiteControls = lazy(() => import("./pages/WebsiteControls"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const AdminProjectManagement = lazy(() => import("./pages/AdminProjectManagement"));
const SwipeIn = lazy(() => import("./pages/SwipeIn"));
const Internal = lazy(() => import("./pages/Internal"));

const RouteLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
