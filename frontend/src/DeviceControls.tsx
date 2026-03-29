import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Radio, Zap, AlertCircle, Lightbulb, Mic, Camera } from "lucide-react";

interface DeviceControlsProps {
  deviceId: number;
  deviceName: string;
  isOnline: boolean;
}

export default function DeviceControls({ deviceId, deviceName, isOnline }: DeviceControlsProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const utils = trpc.useUtils();

  const startRecording = trpc.commands.startRecording.useMutation({
    onSuccess: () => {
      toast.success("Recording started");
      utils.commands.history.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start recording");
    },
  });

  const stopRecording = trpc.commands.stopRecording.useMutation({
    onSuccess: () => {
      toast.success("Recording stopped");
      utils.commands.history.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to stop recording");
    },
  });

  const triggerBuzz = trpc.commands.triggerBuzz.useMutation({
    onSuccess: () => {
      toast.success("Buzz triggered");
      utils.commands.history.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to trigger buzz");
    },
  });

  const toggleFlashlight = trpc.commands.toggleFlashlight.useMutation({
    onSuccess: () => {
      toast.success("Flashlight toggled");
      utils.commands.history.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to toggle flashlight");
    },
  });

  const startTwoWayAudio = trpc.commands.startTwoWayAudio.useMutation({
    onSuccess: () => {
      toast.success("Two-way audio started");
      utils.commands.history.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start two-way audio");
    },
  });

  const handleCommand = async (command: () => Promise<any>) => {
    if (!isOnline) {
      toast.error("Device is offline");
      return;
    }
    setIsExecuting(true);
    try {
      await command();
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Device Controls</span>
          <Badge variant={isOnline ? "default" : "secondary"}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </CardTitle>
        <CardDescription>Remote commands for {deviceName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={() => handleCommand(() => startRecording.mutateAsync({ deviceId }))}
            disabled={!isOnline || isExecuting}
            className="gap-2"
            variant="outline"
          >
            {startRecording.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Radio className="w-4 h-4" />
            )}
            Start Recording
          </Button>

          <Button
            onClick={() => handleCommand(() => stopRecording.mutateAsync({ deviceId }))}
            disabled={!isOnline || isExecuting}
            className="gap-2"
            variant="outline"
          >
            {stopRecording.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Radio className="w-4 h-4" />
            )}
            Stop Recording
          </Button>

          <Button
            onClick={() => handleCommand(() => triggerBuzz.mutateAsync({ deviceId, duration: 3 }))}
            disabled={!isOnline || isExecuting}
            className="gap-2"
            variant="outline"
          >
            {triggerBuzz.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            Trigger Buzz
          </Button>

          <Button
            onClick={() => handleCommand(() => toggleFlashlight.mutateAsync({ deviceId, state: "on" }))}
            disabled={!isOnline || isExecuting}
            className="gap-2"
            variant="outline"
          >
            {toggleFlashlight.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4" />
            )}
            Toggle Flashlight
          </Button>

          <Button
            onClick={() => handleCommand(() => startTwoWayAudio.mutateAsync({ deviceId }))}
            disabled={!isOnline || isExecuting}
            className="gap-2 md:col-span-2"
            variant="outline"
          >
            {startTwoWayAudio.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            Start Two-Way Audio
          </Button>
        </div>

        {!isOnline && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Device is offline. Commands will be queued and executed when the device comes online.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
