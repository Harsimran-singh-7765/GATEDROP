import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { jobApi, paymentApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const PostJob = () => {
  const [formData, setFormData] = useState({
    pickupLocation: "",
    dropLocation: "",
    itemDescription: "",
    jobDeadline: "",
    fee: "30",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fee = parseInt(formData.fee);
    if (fee < 30) {
      toast({
        title: "Invalid fee",
        description: "Minimum fee is ₹30",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create payment order
      const paymentOrder = await paymentApi.createPaymentOrder(fee, token!);
      
      // Step 2: In a real app, you'd integrate Razorpay/Stripe here
      // For now, we'll simulate payment success
      // This is where you'd show Razorpay checkout modal
      
      toast({
        title: "Payment Integration Required",
        description: "In production, Razorpay/Stripe checkout would open here. For now, proceeding with dummy payment...",
      });

      // Simulate payment verification
      const dummyPaymentId = `pay_${Date.now()}`;
      
      // Step 3: Create job with payment ID
      await jobApi.createJob({
        ...formData,
        fee,
        paymentId: dummyPaymentId,
        jobDeadline: formData.jobDeadline || undefined,
      }, token!);

      toast({
        title: "Job posted successfully!",
        description: "Your delivery request is now live.",
      });
      navigate("/current-jobs");
    } catch (error: any) {
      toast({
        title: "Failed to post job",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Post a Delivery Job</h1>
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>Fill in the delivery information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickupLocation">Pickup Location *</Label>
              <Input
                id="pickupLocation"
                placeholder="e.g., Gate 2, Main Entrance"
                value={formData.pickupLocation}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropLocation">Drop Location *</Label>
              <Input
                id="dropLocation"
                placeholder="e.g., H4 Room 101"
                value={formData.dropLocation}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemDescription">Item Description *</Label>
              <Textarea
                id="itemDescription"
                placeholder="e.g., 1 Blue Phone Charger"
                value={formData.itemDescription}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobDeadline">Delivery Deadline (Optional)</Label>
              <Input
                id="jobDeadline"
                type="datetime-local"
                value={formData.jobDeadline}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee">Delivery Fee (₹) *</Label>
              <Input
                id="fee"
                type="number"
                min="30"
                value={formData.fee}
                onChange={handleChange}
                required
              />
              <p className="text-sm text-muted-foreground">Minimum ₹30</p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Processing..." : `Pay ₹${formData.fee} & Post Job`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostJob;
