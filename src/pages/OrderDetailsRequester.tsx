import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Package, Phone, User, AlertCircle, Star, StarHalf } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LiveMapTracker } from "@/components/layout/LiveMapTracker";
import { cn } from "@/lib/utils";

// --- Naya Applicant Interface ---
interface Applicant {
  _id: string;
  name: string;
  reportCount: number;
  totalRatingStars: number;
  totalRatingCount: number;
}

interface Job {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  title: string;
  description: string;
  fee: number;
  status: string;
  runnerDetailsCache?: {
    name: string;
    phone: string;
  };
  createdAt: string;
  applicants: Applicant[]; // Backend se populated data
  ratingGiven: boolean; // Rating di ya nahi
  runnerId?: string; // Runner ID
}

// --- Star Rating Component ---
const StarRating = ({ rating, count }: { rating: number, count: number }) => {
  if (count === 0) {
    return <span className="text-sm text-muted-foreground">New Runner</span>;
  }
  const avgRating = (rating / count);
  const fullStars = Math.floor(avgRating);
  const halfStar = avgRating - fullStars >= 0.5;
  const emptyStars = Math.max(0, 5 - fullStars - (halfStar ? 1 : 0));

  return (
    <div className="flex items-center gap-1">
      {[...Array(fullStars)].map((_, i) => <Star key={`full-${i}`} className="h-4 w-4 text-yellow-500" fill="currentColor" />)}
      {halfStar && <StarHalf key={`half-${i}`} className="h-4 w-4 text-yellow-500" fill="currentColor" />}
      {[...Array(emptyStars)].map((_, i) => <Star key={`empty-${i}`} className="h-4 w-4 text-yellow-300/70" fill="currentColor" />)}
      <span className="text-xs text-muted-foreground ml-1">({count})</span>
    </div>
  );
};


const OrderDetailsRequester = () => {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [reportReason, setReportReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { token, refreshUser, socket } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [runnerLocation, setRunnerLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [rating, setRating] = useState(0); // Rating modal ke liye

  useEffect(() => {
    if (token && id) {
      loadJob();
    }
  }, [id, token]);

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join_job_room', id);
    console.log(`[Socket] Joining room: ${id}`);

    const handleJobUpdate = (updatedJob: Job) => {
      console.log('[Socket] Job updated:', updatedJob);
      setJob(updatedJob);
      if (updatedJob.status === 'accepted') {
        toast({ title: "Runner assigned!", description: "Your job is now in progress." });
      }
      if (updatedJob.status === 'picked_up') {
        toast({ title: "Your order has been picked up!" });
      }
      if (updatedJob.status === 'delivered_by_runner') {
        toast({ title: "Your order has been delivered!", description: "Please confirm to release payment." });
      }
    };

    // --- Naye Socket Listeners ---
    const handleNewApplicant = (newApplicant: Applicant) => {
      console.log('[Socket] New applicant:', newApplicant);
      setApplicants(prev => [...prev, newApplicant]);
      toast({ title: "New Runner Applied!", description: `${newApplicant.name} wants to take your job.` });
    };

    const handleApplicantRemoved = (data: { runnerId: string }) => {
      console.log('[Socket] Applicant removed:', data.runnerId);
      setApplicants(prev => prev.filter(app => app._id !== data.runnerId));
    };

    const handleLocationUpdate = (location: { lat: number, lon: number }) => {
      console.log("[Socket] Received location update:", location);
      setRunnerLocation(location);
    };
    // --- End Naye Listeners ---

    socket.on('job_updated', handleJobUpdate);
    socket.on('new_applicant', handleNewApplicant);
    socket.on('applicant_removed', handleApplicantRemoved);
    socket.on('job_location_updated', handleLocationUpdate);
    socket.on('runner_reported', () => loadJob()); // Report hone par reload

    return () => {
      socket.off('job_updated', handleJobUpdate);
      socket.off('new_applicant', handleNewApplicant);
      socket.off('applicant_removed', handleApplicantRemoved);
      socket.off('job_location_updated', handleLocationUpdate);
      socket.off('runner_reported');
    };
  }, [id, socket, toast]);

  const loadJob = async () => {
    if (!token || !id) return;
    try {
      setIsLoading(true);
      const data = await jobApi.getJobById(id, token);
      setJob(data);
      if (data.status === 'pending_bids') {
        setApplicants(data.applicants || []);
      }
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

  const handleChooseRunner = async (runnerId: string) => {
    if (!token || !id) return;
    try {
      // API call choose karne ke liye
      await jobApi.chooseRunner(id, runnerId, token);
      // Socket 'job_updated' event component ko re-render kar dega
    } catch (error: any) {
      toast({
        title: "Failed to assign runner",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelivery = async () => {
    if (!token || !id) return;
    try {
      await jobApi.confirmDelivery(id, token);
      await refreshUser();
      // Navigate na karein, rating modal dikhayein
      toast({
        title: "Delivery confirmed!",
        description: `Runner has been paid ₹${job?.fee}. Please rate your runner.`,
      });
      // Socket 'job_updated' status ko 'completed' set kar dega
    } catch (error: any) {
      toast({
        title: "Failed to confirm",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRateRunner = async () => {
    if (!token || !id || rating === 0) return;
    try {
      await jobApi.rateRunner(id, rating, token);
      toast({
        title: "Rating Submitted!",
        description: "Thank you for your feedback.",
      });
      navigate("/history"); // Ab history par bhejein
    } catch (error: any) {
      toast({
        title: "Failed to submit rating",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReport = async () => {
    if (!token || !id || !reportReason.trim()) return;
    try {
      await jobApi.reportRunner(id, reportReason, token);
      toast({
        title: "Report submitted",
        description: "Thank you for your feedback. We'll review this case.",
      });
      setReportReason("");
    } catch (error: any) {
      toast({
        title: "Failed to submit report",
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

  // --- RENDER LOGIC ---

  // RENDER 1: Job complete hai, rating bachi hai
  if (job.status === 'completed' && !job.ratingGiven) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Job Complete! Rate your Runner</CardTitle>
            <CardDescription>
              Please rate your experience with {job.runnerDetailsCache?.name || 'the runner'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-10 w-10 cursor-pointer",
                    rating >= star ? "text-yellow-500" : "text-gray-300"
                  )}
                  fill={rating >= star ? "currentColor" : "none"}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
            <Button className="w-full" onClick={handleRateRunner} disabled={rating === 0}>
              Submit Rating
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RENDER 2: Job bids ke liye pending hai (Applicants dikhayein)
  if (job.status === 'pending_bids') {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          ← Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{job.title}</CardTitle>
            <Badge className="bg-yellow-500">Waiting for Applicants</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold mb-1">Description</p>
              <p className="text-muted-foreground">{job.description}</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Route</p>
              <p className="text-muted-foreground">{job.pickupLocation} → {job.dropLocation}</p>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Applicants ({applicants.length})</h3>
              {applicants.length === 0 ? (
                <p className="text-muted-foreground text-center">No runners have applied yet...</p>
              ) : (
                <div className="space-y-3">
                  {applicants.map(app => (
                    <div key={app._id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-semibold">{app.name}</span>
                        <div className="flex items-center gap-2">
                          {/* Rating aur Red Star (Report) dikhayein */}
                          <StarRating rating={app.totalRatingStars} count={app.totalRatingCount} />
                          {app.reportCount > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" /> {app.reportCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleChooseRunner(app._id)}>
                        Choose Runner
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RENDER 3: Job accepted hai ya in progress hai (Tracking dikhayein)
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      accepted: { label: "Runner Assigned", color: "bg-blue-500" },
      picked_up: { label: "Order Picked Up", color: "bg-purple-500" },
      delivered_by_runner: { label: "Awaiting Your Confirmation", color: "bg-orange-500" },
      completed: { label: "Completed", color: "bg-green-500" },
      cancelled: { label: "Cancelled", color: "bg-red-500" },
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

          {/* Live Map */}
          {(job.status === 'accepted' || job.status === 'picked_up' || job.status === 'delivered_by_runner') && (
            <div className="space-y-2">
              <Label>Live Tracking</Label>
              <LiveMapTracker
                runnerLocation={runnerLocation}
                pickupLocation={job.pickupLocation}
                dropLocation={job.dropLocation}
              />
            </div>
          )}

          {/* Pickup/Drop/Description/Fee */}
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
            <p className="font-semibold mb-1">Item Description</p>
            <p className="text-muted-foreground">{job.description}</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Delivery Fee</p>
            <p className="text-2xl font-bold text-primary">₹{job.fee}</p>
          </div>

          {/* Runner Details */}
          {job.runnerDetailsCache && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold mb-3">Runner Information</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{job.runnerDetailsCache.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${job.runnerDetailsCache.phone}`} className="text-primary hover:underline">
                    {job.runnerDetailsCache.phone}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation/Report Section */}
          {job.status === "delivered_by_runner" && (
            <div className="space-y-4 border-t pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" size="lg">Confirm Delivery</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Delivery?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will release ₹{job.fee} to the runner's wallet.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelivery}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="space-y-2">
                <Label htmlFor="report">Having an issue? Report this runner</Label>
                <Textarea
                  id="report"
                  placeholder="Describe the issue..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <Button
                  variant="destructive"
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="w-full"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Submit Report
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetailsRequester;