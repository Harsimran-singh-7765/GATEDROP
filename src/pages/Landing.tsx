import { Button } from "@/components/ui/button";
import { ArrowRight, Package, Wallet, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          
          {/* --- LOGO UPDATED HERE (TEXT REMOVED, SIZE INCREASED) --- */}
          <Link to="/" className="flex items-center">
            {/* Aap is 'h-12' ko 'h-14' ya 'h-16' karke size adjust kar sakte hain 
              h-12 = 48px
              h-14 = 56px
              h-16 = 64px
            */}
            <img src="/logo.png" alt="Gatedrop Logo" className="h-16 w-auto" /> 
          </Link>
          {/* --- END CHANGE --- */}

          <div className="space-x-2">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6">
          Campus Delivery Made <span className="text-primary">Simple</span>
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Need something delivered across campus? Or want to earn extra cash? 
          Gatedrop connects students for quick, reliable peer-to-peer deliveries.
        </p>
        <Link to="/signup">
          <Button size="lg" className="text-lg px-8">
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg text-center">
              <Package className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Post a Job</h4>
              <p className="text-muted-foreground">
                Need something delivered? Post your pickup and drop locations with a fee starting at ₹30.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg text-center">
              <Wallet className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Earn Money</h4>
              <p className="text-muted-foreground">
                Accept delivery jobs, complete them, and earn directly to your wallet.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg text-center">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Safe & Secure</h4>
              <p className="text-muted-foreground">
                Payment held securely until delivery confirmed. Report system keeps everyone accountable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
        <p className="text-muted-foreground mb-8">Join hundreds of students already using Gatedrop</p>
        <Link to="/signup">
          <Button size="lg">Create Your Account</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground flex flex-col items-center gap-4">
          
          {/* --- LOGO UPDATED HERE (TEXT REMOVED, SIZE ADJUSTED) --- */}
          <Link to="/" className="flex items-center">
            {/* Footer ke liye thoda chhota, jaise h-10 (40px) */}
            <img src="/logo.png" alt="Gatedrop Logo" className="h-20 w-auto" /> 
          </Link>
          {/* --- END CHANGE --- */}

          <p>&copy; 2024 Gatedrop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;