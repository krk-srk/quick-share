import { useAuth } from "@/_core/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Camera, Zap, AlertCircle, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import DeviceRegistrationDialog from "@/components/DeviceRegistrationDialog";

export default function DevicesPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: devices, isLoading, error } = trpc.devices.list.useQuery(undefined, {
    enabled: !!user,
  });
  const [showRegistration, setShowRegistration] = useState(false);

  // WebSocket for real-time updates
  const { isConnected, devices: wsDevices, updates, sendCommand } = useWebSocket(user?.id?.toString() || null);
  const [displayDevices, setDisplayDevices] = useState<any[]>([]);
  const [executingCommand, setExecutingCommand] = useState<{ [key: string]: boolean }>({});

  // Merge database devices with WebSocket real-time status
  useEffect(() => {
    if (devices) {
      const merged = devices.map((dbDevice) => {
        const wsDevice = wsDevices.find((d) => d.deviceId === dbDevice.deviceId);
        return {
          ...dbDevice,
          isOnline: wsDevice?.isOnline ?? dbDevice.isOnline,
          metadata: wsDevice?.metadata ?? {},
        };
      });
      setDisplayDevices(merged);
    }
  }, [devices, wsDevices]);

  // Listen for command execution responses
  useEffect(() => {
    if (updates?.type === "command_executed") {
      const { commandId } = updates.payload;
      setExecutingCommand((prev) => {
        const newState = { ...prev };
        delete newState[commandId];
        return newState;
      });
    }
  }, [updates]);

  const handleExecuteCommand = (deviceId: string, commandType: string) => {
    const commandId = `${deviceId}-${commandType}`;
    setExecutingCommand((prev) => ({ ...prev, [commandId]: true }));
    sendCommand(deviceId, commandType, {});

    // Timeout after 10 seconds
    setTimeout(() => {
      setExecutingCommand((prev) => {
        const newState = { ...prev };
        delete newState[commandId];
        return newState;
      });
    }, 10000);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Devices</h1>
          <p className="text-muted-foreground mt-2">Monitor and manage your connected devices</p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" />
              Live
            </Badge>
          )}
          <Button onClick={() => setShowRegistration(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Register Device
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load devices. Please try again.</p>
          </CardContent>
        </Card>
      ) : displayDevices && displayDevices.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayDevices.map((device) => (
            <Card key={device.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{device.deviceName}</CardTitle>
                    <CardDescription className="text-xs mt-1">{device.deviceModel || "Unknown Model"}</CardDescription>
                  </div>
                  <Badge variant={device.isOnline ? "default" : "secondary"} className={device.isOnline ? "bg-green-600" : ""}>
                    {device.isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Device Status Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>Location Tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Camera className="w-4 h-4" />
                    <span>Video Surveillance</span>
                  </div>

                  {/* Real-time Status */}
                  {device.metadata?.status && (
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Battery</span>
                        <span className="font-medium">{device.metadata.status.batteryLevel}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Storage</span>
                        <span className="font-medium">
                          {device.metadata.status.storageUsed?.toFixed(1)} / {device.metadata.status.storageTotal} GB
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Last seen: {device.metadata?.lastLocationTime
                        ? new Date(device.metadata.lastLocationTime).toLocaleString()
                        : device.lastSeen
                        ? new Date(device.lastSeen).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/locations?deviceId=${device.deviceId}`}>
                    <Button variant="outline" size="sm" className="flex-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      Location
                    </Button>
                  </Link>
                  <Link href={`/device/${device.id}`}>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Camera className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </Link>
                </div>

                {/* Device Controls */}
                {device.isOnline && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground">Quick Commands</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={executingCommand[`${device.deviceId}-start_recording`]}
                        onClick={() => handleExecuteCommand(device.deviceId, "start_recording")}
                      >
                        {executingCommand[`${device.deviceId}-start_recording`] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Start Recording"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={executingCommand[`${device.deviceId}-trigger_buzz`]}
                        onClick={() => handleExecuteCommand(device.deviceId, "trigger_buzz")}
                      >
                        {executingCommand[`${device.deviceId}-trigger_buzz`] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Trigger Buzz"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {!device.isOnline && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    Device is offline. Commands will be queued.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No devices registered yet</p>
            <p className="text-muted-foreground text-center mb-6">
              Register your first device to start monitoring and tracking
            </p>
            <Button onClick={() => setShowRegistration(true)}>Register Your First Device</Button>
          </CardContent>
        </Card>
      )}

      <DeviceRegistrationDialog open={showRegistration} onOpenChange={setShowRegistration} />
    </div>
  );
}
