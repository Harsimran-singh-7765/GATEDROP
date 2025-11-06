import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Package, Phone, User, AlertCircle } from "lucide-react";
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

interface Job {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  itemDescription: string;
  fee: number;
  status: string;
  runnerDetailsCache?: {
    name: string;
    phone: string;
  };
  createdAt: string;
}

const OrderDetailsRequester = () => {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { token, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    if (!token || !id) return;
    
    try {
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

  const handleConfirmDelivery = async () => {
    if (!token || !id) return;

    try {
      await jobApi.confirmDelivery(id, token);
      toast({
        title: "Delivery confirmed!",
        description: `Runner has been paid ₹${job?.fee}`,
      });
      await refreshUser();
      navigate("/history");
    } catch (error: any) {
      toast({
        title: "Failed to confirm",
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
      loadJob();
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

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: "Waiting for Runner", color: "bg-yellow-500" },
      accepted: { label: "Runner Assigned", color: "bg-blue-500" },
      picked_up: { label: "Order Picked Up", color: "bg-purple-500" },
      delivered_by_runner: { label: "Awaiting Your Confirmation", color: "bg-orange-500" },
      completed: { label: "Completed", color: "bg-green-500" },
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
            <CardTitle className="text-2xl">Order Details</CardTitle>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <p className="text-muted-foreground">{job.itemDescription}</p>
          </div>

          <div>
            <p className="font-semibold mb-1">Delivery Fee</p>
            <p className="text-2xl font-bold text-primary">₹{job.fee}</p>
          </div>

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

          {job.status === "delivered_by_runner" && (
            <div className="space-y-4 border-t pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    Confirm Delivery Received
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Delivery?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the job as completed and release ₹{job.fee} to the runner's wallet.
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
