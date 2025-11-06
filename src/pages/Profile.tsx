import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, Briefcase, User as UserIcon, Mail, Phone, AlertTriangle } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

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
              <p className="text-4xl font-bold text-primary">₹{user.walletBalance}</p>
            </div>
            <Button className="w-full mt-4" disabled={user.walletBalance === 0}>
              Request Cashout
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Minimum cashout: ₹100
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
              <span className="font-semibold">{user.gigsPostedAsRequester}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm">Deliveries Completed</span>
              </div>
              <span className="font-semibold">{user.gigsCompletedAsRunner}</span>
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
                {user.reportCount}
              </Badge>
            </div>
            {user.reportCount > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md flex gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-yellow-600 mb-1">Warning</p>
                  <p className="text-muted-foreground">
                    You have {user.reportCount} report{user.reportCount > 1 ? "s" : ""}. 
                    {user.reportCount >= 2 && " Your account may be restricted after the next report."}
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
