import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Job {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  itemDescription: string;
  fee: number;
  status: string;
  requesterDetailsCache?: { // Renamed from runnerDetailsCache
    name: string;
    phone: string;
  };
  createdAt: string;
}

const MyRunnerJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
  }, [token]); // <-- FIX: Added token dependency

  const loadJobs = async () => {
    if (!token) return;
    
    try {
      const data = await jobApi.getMyRunnerJobs(token);

      // --- THE FIX ---
      // Filter out completed or cancelled jobs
      const activeJobs = data.filter(job => 
        job.status === 'accepted' || 
        job.status === 'picked_up' || 
        job.status === 'delivered_by_runner'
      );
      // --- END FIX ---

      setJobs(activeJobs); // Set only the active jobs
    } catch (error: any) {
      toast({
        title: "Error loading jobs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      accepted: { label: "Accepted - New!", variant: "default" },
      picked_up: { label: "Picked Up", variant: "default" },
      delivered_by_runner: { label: "Waiting for Confirmation", variant: "outline" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return <div>Loading your runner jobs...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Runner Jobs</h1>
      <p className="text-muted-foreground mb-6">Jobs you've accepted as a Runner</p>
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            You have no active deliveries. Check the "Jobs" tab to accept one!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{job.itemDescription}</CardTitle>
                  {getStatusBadge(job.status)}
                </div>
                <CardDescription>
                  Earning: ₹{job.fee}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Route:</p>
                    <p className="text-muted-foreground">
                      {job.pickupLocation} → {job.dropLocation}
                    </p>
                  </div>
                </div>
                {job.requesterDetailsCache && ( // <-- FIX: Changed to requesterDetailsCache
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span className="font-semibold">{job.requesterDetailsCache.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{job.requesterDetailsCache.phone}</span>
                    </div>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => navigate(`/order/${job._id}/runner`)}
                >
                  Manage Delivery
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRunnerJobs;