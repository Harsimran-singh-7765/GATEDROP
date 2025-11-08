import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Package, Clock, IndianRupee, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

// --- UPDATED JOB INTERFACE ---
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
  applicants: string[]; // <-- Array of user IDs who have applied
}
// --- END UPDATE ---

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

  const handleApplyForJob = async (jobId: string) => {
    if (!token || !socket || !user) return;

    if (user.isBanned) {
      toast({
        title: "Account Restricted",
        description: "Your account has been banned. You cannot apply for new jobs.",
        variant: "destructive",
      });
      return;
    }

    // --- YEH HAI NAYA TOAST MESSAGE ---
    toast({
      title: "Location Access Required",
      description: "Please allow location access to apply for jobs. Your browser will prompt you.",
    });
    // --- END NAYA TOAST MESSAGE ---

    try {
      const getLocation = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser."));
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 1000,
            maximumAge: 0
          });
        });
      };

      await getLocation();
      
      toast({ title: "Location access granted. Applying for job..." }); // Success message for location

      await jobApi.applyForJob(jobId, token);
      
      toast({
        title: "Application Sent!",
        description: "The requester has been notified. Check 'Current Jobs' for status.",
      });

      socket.emit('join_job_room', jobId);

      setJobs(prevJobs => prevJobs.map(job =>
        job._2id === jobId ? { ...job, applicants: [...job.applicants, user._id] } : job
      ));

      navigate("/current-jobs");

    } catch (error: any) {
      if (error.code === 1) { // Error code 1 = PERMISSION_DENIED
        toast({
          title: "Location Permission Denied",
          description: "You must allow location access to apply for jobs. Please check your browser/phone settings.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to apply",
          description: error.message || "Could not get your location. Please ensure GPS is on.",
          variant: "destructive",
        });
      }
    }
  };

  const hasApplied = (job: Job) => {
    if (!user || !job.applicants) {
      return false;
    }
    return job.applicants.includes(user._id);
  };

  if (isLoading) {
    return <div>Loading available jobs...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Jobs</h1>
        <Button className="hidden md:flex" onClick={() => navigate("/post-job")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Post a New Job
        </Button>
      </div>

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
                  onClick={() => handleApplyForJob(job._id)} 
                  disabled={user?.isBanned || hasApplied(job)} 
                >
                  {hasApplied(job) ? "Applied" : "Apply for Job"}
                </Button>
                
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MOBILE FLOATING BUTTON */}
      <Button
        className="md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-30"
        size="icon"
        onClick={() => navigate("/post-job")}
      >
        <PlusCircle className="h-7 w-7" />
      </Button>
    </div>
  );
};

export default Jobs;