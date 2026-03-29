import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Download, Trash2 } from "lucide-react";
import { useState } from "react";

export default function RecordingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: devices } = trpc.devices.list.useQuery(undefined, {
    enabled: !!user,
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  const { data: recordings, isLoading } = trpc.recordings.list.useQuery(
    { deviceId: selectedDeviceId || 0, limit: 50 },
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
        <h1 className="text-3xl font-bold tracking-tight">Recordings</h1>
        <p className="text-muted-foreground mt-2">Access and manage your saved video and audio recordings</p>
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
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : recordings && recordings.length > 0 ? (
                <div className="space-y-4">
                  {recordings.map((recording) => (
                    <Card key={recording.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{recording.recordingName}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {new Date(recording.startTime).toLocaleString()}
                              {recording.endTime && ` - ${new Date(recording.endTime).toLocaleTimeString()}`}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {recording.recordingType}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="p-2 bg-muted rounded">
                              <p className="text-xs text-muted-foreground">Duration</p>
                              <p className="font-semibold">{recording.duration ? `${Math.floor(recording.duration / 60)}m ${recording.duration % 60}s` : "N/A"}</p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-xs text-muted-foreground">Size</p>
                              <p className="font-semibold">{recording.fileSize ? `${(recording.fileSize / 1024 / 1024).toFixed(2)} MB` : "N/A"}</p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-xs text-muted-foreground">Type</p>
                              <p className="font-semibold capitalize">{recording.mimeType || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="gap-2">
                              <Play className="w-4 h-4" />
                              Play
                            </Button>
                            <Button size="sm" variant="outline" className="gap-2">
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline" className="gap-2 text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">No recordings found for this device</p>
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
