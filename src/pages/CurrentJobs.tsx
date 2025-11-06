import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Package, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const CurrentJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    if (!token) return;
    
    try {
      const data = await jobApi.getMyPostedJobs(token);
      setJobs(data);
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
      pending: { label: "Waiting for Runner", variant: "secondary" },
      accepted: { label: "Runner Assigned", variant: "default" },
      picked_up: { label: "Picked Up", variant: "default" },
      delivered_by_runner: { label: "Awaiting Confirmation", variant: "outline" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return <div>Loading your posted jobs...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Current Jobs</h1>
      <p className="text-muted-foreground mb-6">Jobs you've posted as a Requester</p>
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            You haven't posted any jobs yet.
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
                  Posted {new Date(job.createdAt).toLocaleDateString()}
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
                {job.runnerDetailsCache && (
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span className="font-semibold">{job.runnerDetailsCache.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{job.runnerDetailsCache.phone}</span>
                    </div>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => navigate(`/order/${job._id}/requester`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrentJobs;
