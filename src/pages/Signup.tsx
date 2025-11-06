import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    collegeId: "",
  });
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<"register" | "verify">("register");
  const [emailToVerify, setEmailToVerify] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const COLLEGE_EMAIL_DOMAIN = "@mail.jiit.ac.in";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handlePhase1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    
    // --- 1. DOMAIN VALIDATION ---
    if (!formData.email.endsWith(COLLEGE_EMAIL_DOMAIN)) {
      toast({
        title: "Invalid Email Domain",
        description: `Please use your official ${COLLEGE_EMAIL_DOMAIN} email.`,
        variant: "destructive",
      });
      return;
    }
    // --- END VALIDATION ---

    setIsLoading(true);

    try {
      // Step 1: Request OTP from backend (NEW API CALL REQUIRED)
      // NOTE: This API must generate an OTP and save it, and send a verification email.
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send OTP.');
      }

      setEmailToVerify(formData.email);
      setPhase("verify");
      toast({
        title: "OTP Sent!",
        description: `A 6-digit code has been sent to ${formData.email}.`,
      });
      
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Could not send OTP. Server error.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePhase2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast({ title: "Invalid OTP", description: "OTP must be 6 digits.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Step 2: Verify OTP and register user
      // NOTE: This NEW API call will verify the OTP, then save the user.
      
      await signup({
        name: formData.name,
        email: emailToVerify,
        phone: formData.phone,
        password: formData.password,
        collegeId: formData.collegeId || undefined,
        otp: otp // OTP ko backend mein bhejenge
      });

      toast({
        title: "Account created!",
        description: "Welcome to Gatedrop",
      });
      navigate("/jobs");

    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP or registration failed.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDERING ---

  const renderPhase1 = () => (
    <form onSubmit={handlePhase1Submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">College Email (ending in {COLLEGE_EMAIL_DOMAIN})</Label>
        <Input id="email" type="email" placeholder={`e.g., john${COLLEGE_EMAIL_DOMAIN}`} value={formData.email} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="+91 9876543210" value={formData.phone} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="collegeId">College ID (Optional)</Label>
        <Input id="collegeId" placeholder="For verification" value={formData.collegeId} onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input id="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending OTP..." : "Send Verification Code"}
      </Button>
    </form>
  );

  const renderPhase2 = () => (
    <form onSubmit={handlePhase2Submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A verification code has been sent to **{emailToVerify}**. Please check your inbox and spam folder.
      </p>
      <div className="space-y-2">
        <Label htmlFor="otp">6-Digit Code</Label>
        <Input
          id="otp"
          type="number"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
        {isLoading ? "Verifying..." : "Verify & Create Account"}
      </Button>
      <Button variant="link" type="button" className="w-full text-sm" onClick={() => setPhase('register')} disabled={isLoading}>
        Edit Details / Resend Code
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            {/* Logo yahaan aana chahiye, text hata dein */}
            <img src="/logo.png" alt="Gatedrop" className="h-10 w-auto mx-auto" />
          </CardTitle>
          <CardDescription>{phase === 'register' ? 'Create your account' : 'Verify your email'}</CardDescription>
        </CardHeader>
        <CardContent>
          {phase === 'register' ? renderPhase1() : renderPhase2()}
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;