import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, Briefcase, User as UserIcon, Mail, Phone, AlertTriangle } from "lucide-react";
import { useState } from "react"; // <-- useState import
import { useToast } from "@/hooks/use-toast"; // <-- useToast import
import { Input } from "@/components/ui/input"; // <-- Input import
import { Label } from "@/components/ui/label"; // <-- Label import
import { walletApi } from "@/lib/api"; // <-- Wallet API import
import { // <-- AlertDialog imports
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


const Profile = () => {
  // --- New State for Cashout ---
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();
  const [cashoutAmount, setCashoutAmount] = useState(0); 
  const minCashout = 100;

  if (!user) return null;

  const balance = user.walletBalance ? user.walletBalance.toFixed(2) : '0.00';
  const displayWalletBalance = parseFloat(balance);
  
  const handleCashout = async () => {
    if (!token) return;

    // Frontend checks
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
            variant: "success",
        });
        
        // Refresh the user's data to show updated wallet balance instantly
        await refreshUser(); 
        setCashoutAmount(0); // Reset input
    } catch (error: any) {
        toast({
            title: "Cashout Failed",
            description: error.message || "An unknown error occurred.",
            variant: "destructive",
        });
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

        {/* Wallet (UPDATED FOR CASHOUT) */}
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
            
            {/* --- CASH OUT DIALOG --- */}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button 
                        className="w-full mt-4" 
                        disabled={displayWalletBalance < minCashout}
                    >
                        Request Cashout
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Request Payout</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter the amount you wish to withdraw. Minimum amount is ₹{minCashout}.
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
                            Note: This action submits your request. Actual bank transfer will be processed soon.
                        </p>
                    </div>

                    <AlertDialogFooter>
                        {/* Reset amount on Cancel */}
                        <AlertDialogCancel onClick={() => setCashoutAmount(0)}>Cancel</AlertDialogCancel> 
                        <AlertDialogAction 
                            onClick={handleCashout}
                            // Disable if amount is invalid or too low
                            disabled={cashoutAmount < minCashout || cashoutAmount > displayWalletBalance || cashoutAmount === 0} 
                        >
                            Confirm Withdrawal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* --- END CASH OUT DIALOG --- */}

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