import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Vote, Plus, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-gradient-primary rounded-lg shadow-glow group-hover:scale-110 transition-transform">
            <Vote className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            VotePoll
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {isAdmin && (
                <Button
                  onClick={() => navigate("/create")}
                  className="bg-gradient-primary hover:shadow-glow transition-all"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Poll
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => navigate("/profile")}>
                <User className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                className="bg-gradient-primary hover:shadow-glow transition-all"
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
