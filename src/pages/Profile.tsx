import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, Briefcase, User as UserIcon, Mail, Phone, AlertTriangle, Star, StarHalf } from "lucide-react";
import { useState, useEffect } from "react"; // <-- Make sure useEffect is imported
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { walletApi, userApi } from "@/lib/api";
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
import { cn } from "@/lib/utils";

// --- Re-usable Star Rating Component ---
const StarRating = ({ rating, count }: { rating: number, count: number }) => {
  // Handle 0 or undefined count
  const safeCount = count || 0;
  const safeRating = rating || 0;

  if (safeCount === 0) {
    // Show 5 empty stars if no ratings
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
        ))}
        <span className="text-sm text-muted-foreground ml-1">(0)</span>
      </div>
    );
  }

  // Ensure rating is a number
  const numRating = rating || 0;

  // Calculate average and clamp it between 0 and 5
  let avgRating = (numRating / safeCount);
  avgRating = Math.max(0, Math.min(5, avgRating)); // Safety clamp

  const fullStars = Math.floor(avgRating);
  const halfStar = avgRating - fullStars >= 0.5;

  // Ensure emptyStars can never be negative
  const emptyStars = Math.max(0, 5 - fullStars - (halfStar ? 1 : 0));

  return (
    <div className="flex items-center gap-1">
      {[...Array(fullStars)].map((_, i) => <Star key={`full-${i}`} className="h-5 w-5 text-yellow-500" fill="currentColor" />)}
      {halfStar && <StarHalf key="half" className="h-5 w-5 text-yellow-500" fill="currentColor" />}
      {[...Array(emptyStars)].map((_, i) => <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />)}
      <span className="text-sm text-muted-foreground ml-1">({safeCount})</span>
    </div>
  );
};
// --- END Star Rating Component ---


const Profile = () => {
  const { user, token, refreshUser, socket } = useAuth(); // <-- Get socket from context
  const { toast } = useToast();
  const [cashoutAmount, setCashoutAmount] = useState(0);
  const [upiId, setUpiId] = useState(user?.upiId || "");
  const [isUpiLoading, setIsUpiLoading] = useState(false);
  const minCashout = 100;

  // --- YEH HAI SOCKET.IO FIX ---
  // Listen for instant rating updates
  useEffect(() => {
    if (!socket || !user) return;

    const handleRatingUpdate = (data: { 
      userId: string, 
      totalRatingStars: number,
      totalRatingCount: number
    }) => {
      // Check if this update is for the current user
      if (data.userId === user._id) {
        console.log('[Socket] Rating update received!');
        refreshUser(); // Refresh user data to get new rating stats
        toast({ title: "You received a new rating!" });
      }
    };

    // Listen for the event from the backend
    socket.on('user_rating_updated', handleRatingUpdate);

    // Cleanup listener on component unmount
    return () => {
      socket.off('user_rating_updated', handleRatingUpdate);
    };
  }, [socket, user?._id, refreshUser, toast]); // Dependencies
  // --- END SOCKET.IO FIX ---
  
  if (!user) return null; // Component renders null while user is loading

  const balance = user.walletBalance ? user.walletBalance.toFixed(2) : '0.00';
  const displayWalletBalance = parseFloat(balance);

  const handleCashout = async () => {
    if (!token) return;

    if (!user.upiId) {
      toast({
        title: "Payout Method Missing",
        description: "Please add your UPI ID in Payout Settings before cashing out.",
        variant: "destructive",
      });
      return;
    }

    if (cashoutAmount < minCashout || cashoutAmount > displayWalletBalance) {
      toast({
        title: "Invalid Amount",
        description: `Amount must be between ₹${minCashout} and ₹${displayWalletBalance.toFixed(2)}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await walletApi.requestCashout(cashoutAmount, token);
      toast({
        title: "Cashout Successful!",
        description: `₹${cashoutAmount.toFixed(2)} deducted. Payment request is being processed.`,
      });
      await refreshUser();
      setCashoutAmount(0);
    } catch (error: any) {
      toast({
        title: "Cashout Failed",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleUpiSave = async () => {
    if (!token || !upiId) return;
    setIsUpiLoading(true);
    try {
      await userApi.updateProfile({ upiId: upiId }, token);
      await refreshUser();
      toast({
        title: "UPI ID Updated!",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save UPI ID",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpiLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.profileImageUrl} />
                <AvatarFallback className="text-2xl">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{user.name}</h3>
                {user.isBanned && (
                  <Badge variant="destructive" className="mt-1">
                    Account Restricted
                  </Badge>
                )}
                {/* --- Show Rating --- */}
                <div className="mt-2">
                  <StarRating
                    rating={user.totalRatingStars || 0}
                    count={user.totalRatingCount || 0}
                  />
                </div>
                {/* --- END --- */}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
              <p className="text-4xl font-bold text-primary">₹{displayWalletBalance.toFixed(2)}</p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full mt-4"
                  disabled={displayWalletBalance < minCashout || !user.upiId} // Disable if no UPI
                >
                  Request Cashout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Request Payout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter the amount you wish to withdraw to **{user.upiId}**. Minimum is ₹{minCashout}.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 pt-2">
                  <Label htmlFor="cashout-amount">Amount (Max: ₹{displayWalletBalance.toFixed(2)})</Label>
                  <Input
                    id="cashout-amount"
                    type="number"
                    placeholder="e.g., 250"
                    value={cashoutAmount || ''}
                    onChange={(e) => setCashoutAmount(parseFloat(e.target.value) || 0)}
                    max={displayWalletBalance}
                    min={minCashout}
                  />
                  <p className="text-xs text-muted-foreground">
                    Note: This action submits your request. Payment will be processed soon.
                  </p>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setCashoutAmount(0)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCashout}
                    disabled={cashoutAmount < minCashout || cashoutAmount > displayWalletBalance || cashoutAmount === 0}
                  >
                    Confirm Withdrawal
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <p className="text-xs text-muted-foreground mt-2 text-center">
              Minimum cashout: ₹{minCashout}
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm">Jobs Posted</span>
              </div>
              <span className="font-semibold">{user.gigsPostedAsRequester || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm">Deliveries Completed</span>
              </div>
              <span className="font-semibold">{user.gigsCompletedAsRunner || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payout Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Settings</CardTitle>
            <CardDescription>Where should we send your money?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <div className="flex gap-2">
                <Input
                  id="upiId"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
                <Button onClick={handleUpiSave} disabled={isUpiLoading || upiId === user.upiId}>
                  {isUpiLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
            <div className="text-center text-muted-foreground text-sm">
              (Bank Account fields coming soon)
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Report Count</span>
              <Badge variant={user.reportCount > 0 ? "destructive" : "secondary"}>
                {user.reportCount || 0}
              </Badge>
            </div>
            {(user.reportCount || 0) > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md flex gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-yellow-600 mb-1">Warning</p>
                  <p className="text-muted-foreground">
                    You have {user.reportCount} report{user.reportCount > 1 ? "s" : ""}.
                    {(user.reportCount || 0) >= 2 && " Your account may be restricted after the next report."}
                  </p>
                </div>
              </div>
            )}
            {user.isBanned && (
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md flex gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-red-600 mb-1">Account Restricted</p>
                  <p className="text-muted-foreground">
                    Due to multiple reports, you cannot accept new jobs. Please contact support.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;