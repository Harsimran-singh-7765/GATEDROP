import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, User, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // <-- Tabs import karein

interface Job {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  title: string;
  description: string;
  fee: number;
  status: string;
  runnerDetailsCache?: { name: string; phone: string; };
  requesterDetailsCache?: { name: string; phone: string; };
  createdAt: string;
}

const CurrentJobs = () => {
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [runnerJobs, setRunnerJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token, socket } = useAuth(); 
  const { toast } = useToast();
  
  useEffect(() => {
    if (token) {
      loadJobs();
    }
  }, [token]);

  // Socket listener (ab yeh dono lists ko update karega)
  useEffect(() => {
    if (!socket) return;

    console.log("[Socket] CurrentJobs setting up listeners...");

    const handleJobUpdate = (updatedJob: Job) => {
      console.log("[Socket] CurrentJobs received update for:", updatedJob._id);
      
      const isCompleted = updatedJob.status === 'completed' || updatedJob.status === 'cancelled';
      
      // Posted jobs ko update karo
      setPostedJobs(prevJobs => 
        isCompleted
          ? prevJobs.filter(job => job._id !== updatedJob._id)
          : prevJobs.map(job => job._id === updatedJob._id ? updatedJob : job)
      );
      
      // Runner jobs ko update karo
      setRunnerJobs(prevJobs => 
        isCompleted
          ? prevJobs.filter(job => job._id !== updatedJob._id)
          : prevJobs.map(job => job._id === updatedJob._id ? updatedJob : job)
      );
    };

    // Dono active jobs ke rooms join karo
    [...postedJobs, ...runnerJobs].forEach(job => {
      if (job && job._id) { // Safety check
        socket.emit('join_job_room', job._id);
      }
    });

    socket.on('job_updated', handleJobUpdate);

    return () => {
      socket.off('job_updated', handleJobUpdate);
    };
  }, [socket, postedJobs, runnerJobs]);

  const loadJobs = async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      // Dono lists ko ek saath fetch karo
      const [postedData, runnerData] = await Promise.all([
        jobApi.getMyPostedJobs(token),
        jobApi.getMyRunnerJobs(token)
      ]);
      
      // Active "Posted" jobs
      setPostedJobs(
        postedData.filter(job => 
          job.status !== 'completed' && job.status !== 'cancelled'
        )
      );
      
      // Active "Runner" jobs
      setRunnerJobs(
        runnerData.filter(job => 
          job.status === 'accepted' || 
          job.status === 'picked_up' || 
          job.status === 'delivered_by_runner'
        )
      );
      
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

  if (isLoading) {
    return <div>Loading your jobs...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Current Jobs</h1>
      
      <Tabs defaultValue="requester" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requester">As Requester</TabsTrigger>
          <TabsTrigger value="runner">As Runner</TabsTrigger>
        </TabsList>
        
        {/* === TAB 1: AS REQUESTER === */}
        <TabsContent value="requester" className="mt-6">
          {postedJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                You have no active jobs.
              </CardContent>
            </Card>
          ) : (
            <RequesterJobsList jobs={postedJobs} />
          )}
        </TabsContent>
        
        {/* === TAB 2: AS RUNNER === */}
        <TabsContent value="runner" className="mt-6">
          {runnerJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                You have no active deliveries.
              </CardContent>
            </Card>
          ) : (
            <RunnerJobsList jobs={runnerJobs} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Helper Component: Requester Jobs List ---
const RequesterJobsList = ({ jobs }: { jobs: Job[] }) => {
  const navigate = useNavigate();
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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {jobs.map((job) => (
        <Card key={job._id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{job.title}</CardTitle>
              {getStatusBadge(job.status)}
            </div>
            <CardDescription>
              Posted {new Date(job.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary mt-0.5" />
              <p className="text-muted-foreground">
                {job.pickupLocation} → {job.dropLocation}
              </p>
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
            <Button className="w-full" onClick={() => navigate(`/order/${job._id}/requester`)}>
              View Details
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// --- Helper Component: Runner Jobs List ---
const RunnerJobsList = ({ jobs }: { jobs: Job[] }) => {
  const navigate = useNavigate();
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      accepted: { label: "Accepted - New!", variant: "default" },
      picked_up: { label: "Picked Up", variant: "default" },
      delivered_by_runner: { label: "Waiting for Confirmation", variant: "outline" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {jobs.map((job) => (
        <Card key={job._id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{job.title}</CardTitle>
              {getStatusBadge(job.status)}
            </div>
            <CardDescription>
              Earning: ₹{job.fee}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary mt-0.5" />
              <p className="text-muted-foreground">
                {job.pickupLocation} → {job.dropLocation}
              </p>
            </div>
            {job.requesterDetailsCache && ( 
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
            <Button className="w-full" onClick={() => navigate(`/order/${job._id}/runner`)}>
              Manage Delivery
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CurrentJobs;