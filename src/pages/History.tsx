import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapPin, CheckCircle, ChevronDown } from "lucide-react"; // <-- 1. IMPORT ChevronDown
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"; // <-- 2. IMPORT Collapsible
import { Button } from "@/components/ui/button"; // <-- 3. IMPORT Button

interface Job {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  title: string; // <-- 4. FIX: 'itemDescription' se 'title'
  description: string; // <-- 5. FIX: 'description' add kiya
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
    if (token) {
      loadHistory();
    }
  }, [token]); 

  const loadHistory = async () => {
    if (!token) return;
    
    try {
      setIsLoading(true); // <-- FIX: Loading state set kiya
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

  const asRequester = jobs.filter(job => job.requesterId === user?._id);
  const asRunner = jobs.filter(job => job.runnerId === user?._id);

  const JobCard = ({ job, role }: { job: Job; role: "requester" | "runner" }) => (
    <Card key={job._id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          {/* --- 6. FIX: 'job.itemDescription' ko 'job.title' kiya --- */}
          <CardTitle className="text-lg">{job.title}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-3 w-3 mr-1" />
              {job.status === 'completed' ? 'Completed' : 'Cancelled'}
            </Badge>
            <span className="text-sm font-semibold text-primary">
              {role === "runner" ? `Earned ₹${job.fee}` : `Paid ₹${job.fee}`}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <span className="text-muted-foreground">
              {job.pickupLocation} → {job.dropLocation}
            </span>
          </div>
        </div>

        {/* --- 7. FIX: Collapsible Description Add Kiya --- */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto text-sm">
              <ChevronDown className="h-4 w-4 mr-1" />
              View Description
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {job.description}
            </p>
          </CollapsibleContent>
        </Collapsible>
        {/* --- END FIX --- */}

        <p className="text-xs text-muted-foreground pt-2">
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