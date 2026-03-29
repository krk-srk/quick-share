import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin, Camera, Zap, Radio, AlertCircle, FileVideo } from "lucide-react";
import { useRoute } from "wouter";
import { MapView } from "@/components/Map";
import DeviceControls from "@/components/DeviceControls";

export default function DeviceDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const [, params] = useRoute("/device/:id");
  const deviceId = params?.id ? parseInt(params.id) : null;

  const { data: device, isLoading: deviceLoading } = trpc.devices.getById.useQuery(
    { deviceId: deviceId || 0 },
    { enabled: !!user && !!deviceId }
  );

  const { data: location } = trpc.locations.latest.useQuery(
    { deviceId: deviceId || 0 },
    { enabled: !!user && !!deviceId }
  );

  const { data: alerts } = trpc.alerts.list.useQuery(
    { deviceId: deviceId || 0, limit: 10 },
    { enabled: !!user && !!deviceId }
  );

  const { data: recordings } = trpc.recordings.list.useQuery(
    { deviceId: deviceId || 0, limit: 10 },
    { enabled: !!user && !!deviceId }
  );

  if (authLoading || deviceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Device not found or you don't have access to it.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{device.deviceName}</h1>
          <p className="text-muted-foreground mt-2">{device.deviceModel || "Unknown Model"}</p>
        </div>
        <Badge variant={device.isOnline ? "default" : "secondary"} className="text-base px-3 py-1">
          {device.isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      <DeviceControls deviceId={device.id} deviceName={device.deviceName} isOnline={device.isOnline} />

      <Tabs defaultValue="map" className="space-y-4">
        <TabsList>
          <TabsTrigger value="map" className="gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="recordings" className="gap-2">
            <FileVideo className="w-4 h-4" />
            Recordings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Location</CardTitle>
              <CardDescription>Real-time GPS tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {location ? (
                <div className="space-y-4">
                  <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                    <MapView />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Latitude</label>
                      <p className="text-lg font-semibold">{Number(location.latitude).toFixed(6)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Longitude</label>
                      <p className="text-lg font-semibold">{Number(location.longitude).toFixed(6)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Accuracy</label>
                      <p className="text-lg font-semibold">{location.accuracy ? `${Number(location.accuracy).toFixed(2)}m` : "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Speed</label>
                      <p className="text-lg font-semibold">{location.speed ? `${Number(location.speed).toFixed(2)} m/s` : "N/A"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No location data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Latest notifications and events</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</p>
                      </div>
                      <Badge>{alert.severity}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No alerts</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Recordings</CardTitle>
              <CardDescription>Latest saved video and audio</CardDescription>
            </CardHeader>
            <CardContent>
              {recordings && recordings.length > 0 ? (
                <div className="space-y-3">
                  {recordings.map((recording) => (
                    <div key={recording.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{recording.recordingName}</p>
                        <p className="text-sm text-muted-foreground">{new Date(recording.startTime).toLocaleString()}</p>
                      </div>
                      <Button size="sm" variant="outline">View</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No recordings</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
