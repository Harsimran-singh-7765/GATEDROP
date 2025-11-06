import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, CheckCircle } from "lucide-react";

interface Job {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  itemDescription: string;
  fee: number;
  status: string;
  requesterId: string;
  runnerId: string;
  createdAt: string;
}

const History = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (!token) return;
    
    try {
      const data = await jobApi.getJobHistory(token);
      setJobs(data);
    } catch (error: any) {
      toast({
        title: "Error loading history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const asRequester = jobs.filter(job => job.requesterId === user?.id);
  const asRunner = jobs.filter(job => job.runnerId === user?.id);

  const JobCard = ({ job, role }: { job: Job; role: "requester" | "runner" }) => (
    <Card key={job._id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{job.itemDescription}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
            <span className="text-sm font-semibold text-primary">
              {role === "runner" ? `Earned ₹${job.fee}` : `Paid ₹${job.fee}`}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <span className="text-muted-foreground">
              {job.pickupLocation} → {job.dropLocation}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Completed on {new Date(job.createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div>Loading history...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">History</h1>
      <Tabs defaultValue="requester" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requester">As Requester</TabsTrigger>
          <TabsTrigger value="runner">As Runner</TabsTrigger>
        </TabsList>
        <TabsContent value="requester" className="mt-6">
          {asRequester.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No completed jobs as requester yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {asRequester.map(job => (
                <JobCard key={job._id} job={job} role="requester" />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="runner" className="mt-6">
          {asRunner.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No completed jobs as runner yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {asRunner.map(job => (
                <JobCard key={job._id} job={job} role="runner" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;
