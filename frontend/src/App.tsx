import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { useLocation } from "wouter";
import DevicesPage from "./pages/Devices";
import RecordingsPage from "./pages/Recordings";
import AlertsPage from "./pages/Alerts";
import ProfilePage from "./pages/Profile";
import DeviceDetailPage from "./pages/DeviceDetail";
import LocationTrackingPage from "./pages/LocationTracking";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DevicesPage} />
      <Route path="/locations" component={LocationTrackingPage} />
      <Route path="/recordings" component={RecordingsPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/device/:id" component={DeviceDetailPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <DashboardLayout>
            <Router />
          </DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
