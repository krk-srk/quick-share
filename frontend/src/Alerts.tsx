import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, Filter, X } from "lucide-react";
import { useState } from "react";

const alertTypeIcons: Record<string, React.ReactNode> = {
  motion: "🎥",
  sound: "🔊",
  offline: "⚠️",
  online: "✅",
  custom: "📢",
};

const severityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

type AlertFilter = "all" | "motion" | "sound" | "offline" | "online";

export default function AlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: devices } = trpc.devices.list.useQuery(undefined, {
    enabled: !!user,
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>("all");

  const { data: alerts, isLoading } = trpc.alerts.list.useQuery(
    { deviceId: selectedDeviceId || 0, limit: 100 },
    {
      enabled: !!user && !!selectedDeviceId,
    }
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alerts & Notifications</h1>
        <p className="text-muted-foreground mt-2">View motion detection, sound alerts, and device status changes</p>
      </div>

      {devices && devices.length > 0 ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {devices.map((device) => (
              <Button
                key={device.id}
                variant={selectedDeviceId === device.id ? "default" : "outline"}
                onClick={() => setSelectedDeviceId(device.id)}
                className="whitespace-nowrap"
              >
                {device.deviceName}
              </Button>
            ))}
          </div>

          {selectedDeviceId && (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                  variant={alertFilter === "all" ? "default" : "outline"}
                  onClick={() => setAlertFilter("all")}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  All Alerts
                </Button>
                {["motion", "sound", "offline", "online"].map((type) => (
                  <Button
                    key={type}
                    variant={alertFilter === type ? "default" : "outline"}
                    onClick={() => setAlertFilter(type as AlertFilter)}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : alerts && alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts
                    .filter((alert) => alertFilter === "all" || alert.alertType === alertFilter)
                    .map((alert) => (
                    <Card key={alert.id} className={alert.isRead ? "opacity-75" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl">{alertTypeIcons[alert.alertType] || "📢"}</span>
                            <div className="flex-1">
                              <CardTitle className="text-base">{alert.title}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {new Date(alert.createdAt).toLocaleString()}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <Badge className={severityColors[alert.severity]}>
                              {alert.severity}
                            </Badge>
                            {alert.isRead && (
                              <Badge variant="outline">Read</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {alert.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No alerts for this device</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No devices available. Register a device first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
