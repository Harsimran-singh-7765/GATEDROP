import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Package, Clock, IndianRupee, PlusCircle } from "lucide-react"; // <-- PlusCircle import
import { useNavigate } from "react-router-dom";

interface Job {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  title: string;
  description: string;
  jobDeadline?: string;
  fee: number;
  status: string;
  createdAt: string;
  requesterId: string; 
}

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token, user, socket } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      loadJobs();
    }
  }, [token]); 

  useEffect(() => {
    if (!socket || !user) return; 

    console.log("[Socket] Jobs.tsx setting up listeners...");

    const handleNewJob = (newJob: Job) => {
      console.log('[Socket] Received new job:', newJob);
      if (newJob.requesterId !== user._id) {
        setJobs(prevJobs => [newJob, ...prevJobs]);
      }
    };

    const handleJobTaken = (jobTaken: { _id: string }) => {
      console.log('[Socket] Job taken:', jobTaken._id);
      setJobs(prevJobs => prevJobs.filter(job => job._id !== jobTaken._id));
    };

    socket.on('new_job_available', handleNewJob);
    socket.on('job_taken', handleJobTaken);

    return () => {
      console.log("[Socket] Jobs.tsx cleaning up listeners.");
      socket.off('new_job_available', handleNewJob);
      socket.off('job_taken', handleJobTaken);
    };
  }, [socket, user]); 

  const loadJobs = async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const data = await jobApi.getAvailableJobs(token);
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

  const handleAcceptJob = async (jobId: string) => {
    if (!token) return;

    if (user?.isBanned) {
      toast({
        title: "Account Restricted",
        description: "Your account has been banned due to reports. You cannot accept new jobs.",
        variant: "destructive",
      });
      return;
    }

    try {
      await jobApi.acceptJob(jobId, token);
      toast({
        title: "Job accepted!",
        description: "Check 'Current Jobs' to manage this delivery.",
      });
      navigate("/current-jobs"); // <-- FIX: /my-runner-jobs se /current-jobs
    } catch (error: any) {
      toast({
        title: "Failed to accept job",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading available jobs...</div>;
  }

  return (
    <div>
      {/* --- YEH HAI FIX: HEADER AUR BUTTON --- */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Jobs</h1>
        {/* Desktop Button */}
        <Button className="hidden md:flex" onClick={() => navigate("/post-job")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Post a New Job
        </Button>
      </div>
      {/* --- END FIX --- */}

      {user?.isBanned && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive font-semibold">
              Your account has been restricted due to multiple reports. You cannot accept new jobs.
            </p>
          </CardContent>
        </Card>
      )}
      
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No jobs available right now. Check back later!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <Badge className="bg-primary">₹{job.fee}</Badge>
                </div>
                <CardDescription>
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                </CardDescription>
          </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Pickup:</p>
                    <p className="text-muted-foreground">{job.pickupLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Drop:</p>
                    <p className="text-muted-foreground">{job.dropLocation}</p>
                  </div>
                </div>
                {job.jobDeadline && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Deliver by {new Date(job.jobDeadline).toLocaleString()}
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => handleAcceptJob(job._id)}
                  disabled={user?.isBanned}
                >
                  Accept Job
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* --- YEH HAI FIX: MOBILE FLOATING BUTTON --- */}
      {/* 'bottom-20' isliye taaki yeh bottom nav ke upar aaye (h-16 nav + 1rem padding) */}
      <Button 
        className="md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-30" 
        size="icon"
        onClick={() => navigate("/post-job")}
      >
        <PlusCircle className="h-14- w-14" />
      </Button>
      {/* --- END FIX --- */}
    </div>
  );
};

export default Jobs;