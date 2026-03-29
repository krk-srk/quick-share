import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DeviceRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeviceRegistrationDialog({ open, onOpenChange }: DeviceRegistrationDialogProps) {
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = trpc.useUtils();
  const createDevice = trpc.devices.create.useMutation({
    onSuccess: () => {
      toast.success("Device registered successfully!");
      utils.devices.list.invalidate();
      setDeviceId("");
      setDeviceName("");
      setDeviceModel("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to register device");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceId.trim() || !deviceName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createDevice.mutateAsync({
        deviceId,
        deviceName,
        deviceModel,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register New Device</DialogTitle>
          <DialogDescription>
            Add a new device to your monitoring dashboard. Enter the device ID and a friendly name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deviceId">Device ID *</Label>
            <Input
              id="deviceId"
              placeholder="e.g., DEVICE-12345"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for your device (found in device settings)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deviceName">Device Name *</Label>
            <Input
              id="deviceName"
              placeholder="e.g., Living Room Camera"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deviceModel">Device Model</Label>
            <Input
              id="deviceModel"
              placeholder="e.g., OPPO A17"
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register Device"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
