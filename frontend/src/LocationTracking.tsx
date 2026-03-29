import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { useState } from "react";
import { MapView } from "@/components/Map";

export default function LocationTrackingPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: devices } = trpc.devices.list.useQuery(undefined, {
    enabled: !!user,
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  const { data: location, isLoading: locationLoading } = trpc.locations.latest.useQuery(
    { deviceId: selectedDeviceId || 0 },
    {
      enabled: !!user && !!selectedDeviceId,
    }
  );

  const { data: locationHistory, isLoading: historyLoading } = trpc.locations.history.useQuery(
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
        <h1 className="text-3xl font-bold tracking-tight">Location Tracking</h1>
        <p className="text-muted-foreground mt-2">Real-time GPS tracking and location history for your devices</p>
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
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Current Location
                    </CardTitle>
                    <CardDescription>Real-time GPS position</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {locationLoading ? (
                      <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : location ? (
                      <div className="space-y-4">
                        <div className="h-96 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          <MapView />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <label className="text-xs font-medium text-muted-foreground">Latitude</label>
                            <p className="text-lg font-semibold mt-1">{Number(location.latitude).toFixed(6)}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <label className="text-xs font-medium text-muted-foreground">Longitude</label>
                            <p className="text-lg font-semibold mt-1">{Number(location.longitude).toFixed(6)}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <label className="text-xs font-medium text-muted-foreground">Accuracy</label>
                            <p className="text-lg font-semibold mt-1">
                              {location.accuracy ? `${Number(location.accuracy).toFixed(2)}m` : "N/A"}
                            </p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <label className="text-xs font-medium text-muted-foreground">Altitude</label>
                            <p className="text-lg font-semibold mt-1">
                              {location.altitude ? `${Number(location.altitude).toFixed(2)}m` : "N/A"}
                            </p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <label className="text-xs font-medium text-muted-foreground">Speed</label>
                            <p className="text-lg font-semibold mt-1">
                              {location.speed ? `${Number(location.speed).toFixed(2)} m/s` : "N/A"}
                            </p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <label className="text-xs font-medium text-muted-foreground">Heading</label>
                            <p className="text-lg font-semibold mt-1">
                              {location.heading ? `${Number(location.heading).toFixed(0)}°` : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Last updated: {new Date(location.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">No location data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Location History
                    </CardTitle>
                    <CardDescription>Recent GPS positions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : locationHistory && locationHistory.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {locationHistory.map((loc, index) => (
                          <div
                            key={loc.id}
                            className="p-2 border rounded-lg hover:bg-muted transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-xs font-medium">
                                  {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(loc.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                              {index === 0 && (
                                <Badge variant="default" className="text-xs">Latest</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No location history</p>
                    )}
                  </CardContent>
                </Card>
              </div>
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
