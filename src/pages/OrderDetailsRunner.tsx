import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Package, Phone, User, CheckCircle } from "lucide-react";

interface Job {
  _id: string;
  title: string;
  description: string;
  pickupLocation: string;
  dropLocation: string;
  fee: number;
  status: string;
  requesterDetailsCache?: {
    name: string;
    phone: string;
  };
}

const OrderDetailsRunner = () => {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token, socket } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- Geolocation Tracking Effect (UPDATED) ---
  useEffect(() => {
    let watchId: number | null = null;

    if (socket && id && (job?.status === 'accepted' || job?.status === 'picked_up')) {
      console.log('[GeoLocation] Starting position watch...');
      
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`[GeoLocation] Got new coords: Lat: ${latitude}, Lon: ${longitude}`);

          if (socket.connected) { // Check if socket is still connected
            socket.emit('runner_location_update', {
              jobId: id,
              location: { lat: latitude, lon: longitude }
            });
          }
        },
        (error) => {
          console.error("Error watching position:", error);
          toast({ title: "Location Error", description: "Could not get your location.", variant: "destructive" });
        },
        // --- YEH HAIN QUICK FIXES ---
        { 
          enableHighAccuracy: true, // Sabse accurate data (zaroori hai)
          timeout: 100, 
          maximumAge: 0 // Koi bhi purana (cached) data mat do, hamesha naya data do
        }
        // --- END FIXES ---
      );
    }

    return () => {
      if (watchId) {
        console.log('[GeoLocation] Stopping position watch.');
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [job?.status, socket, id, toast]);
  // --- END Geolocation Effect ---

  // Job data load karna
  useEffect(() => {
    if (token && id) {
      loadJob();
    }
  }, [id, token]);

  // Socket se job updates sunna
  useEffect(() => {
    if (!socket || !id) return; 

    socket.emit('join_job_room', id);
    console.log(`[Socket] Runner joining room: ${id}`);

    const handleJobUpdate = (updatedJob: Job) => {
      console.log('[Socket] Runner received job update:', updatedJob);
      setJob(updatedJob); 

      if (updatedJob.status === 'completed') {
        toast({
          title: "Job Completed!",
          description: `₹${updatedJob.fee} has been added to your wallet.`,
        });
      }
    };

    socket.on('job_updated', handleJobUpdate);

    return () => {
      socket.off('job_updated', handleJobUpdate);
    };
  }, [id, socket, toast]);

  const loadJob = async () => {
    if (!token || !id) return;
    
    try {
      setIsLoading(true);
      const data = await jobApi.getJobById(id, token);
      setJob(data);
    } catch (error: any) {
      toast({
        title: "Error loading job",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!token || !id) return;

    try {
      await jobApi.updateJobStatus(id, newStatus, token);
      toast({
        title: "Status updated",
        description: "Job status has been updated successfully.",
      });
      // Socket update karega, loadJob() ki zaroorat nahi
    } catch (error: any) {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading job details...</div>;
  }

  if (!job) {
    return <div>Job not found</div>;
  }

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      accepted: { label: "Accepted", color: "bg-blue-500" },
      picked_up: { label: "Picked Up", color: "bg-purple-500" },
      delivered_by_runner: { label: "Waiting for Confirmation", color: "bg-orange-500" },
      completed: { label: "Completed - Payment Released", color: "bg-green-500" },
    };
    return statusMap[status] || { label: status, color: "bg-gray-500" };
  };

  const statusInfo = getStatusInfo(job.status);

  return (
    <div className="max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        ← Back
      </Button>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl">{job.title}</CardTitle>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-primary/10 p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">You'll Earn</p>
            <p className="text-3xl font-bold text-primary">₹{job.fee}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Pickup</p>
                  <p className="text-muted-foreground">{job.pickupLocation}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Package className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Drop</p>
                  <p className="text-muted-foreground">{job.dropLocation}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-1">Full Description</p>
            <p className="text-muted-foreground">{job.description}</p>
          </div>

          {job.requesterDetailsCache && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold mb-3">Requester Information</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{job.requesterDetailsCache.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${job.requesterDetailsCache.phone}`} className="text-primary hover:underline">
                    {job.requesterDetailsCache.phone}
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            {job.status === "accepted" && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleStatusUpdate("picked_up")}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Mark as Picked Up
              </Button>
            )}
            {job.status === "picked_up" && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleStatusUpdate("delivered_by_runner")}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Mark as Delivered
              </Button>
            )}
            {job.status === "delivered_by_runner" && (
              <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg text-center">
                <p className="text-sm font-medium">Waiting for requester to confirm delivery</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Once confirmed, ₹{job.fee} will be added to your wallet
                </p>
              </div>
            )}
            {job.status === "completed" && (
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-600">Delivery Completed!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ₹{job.fee} has been added to your wallet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetailsRunner;