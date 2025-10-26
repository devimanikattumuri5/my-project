import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Mail, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface Profile {
  username: string;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please sign in to view profile");
      navigate("/auth");
      return;
    }

    setEmail(user.email || "");

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, created_at")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setUsername(profileData.username);
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    if (username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    setIsSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please sign in");
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim() })
      .eq("id", user.id);

    setIsSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Username already taken");
      } else {
        toast.error("Failed to update profile");
      }
      return;
    }

    toast.success("Profile updated successfully!");
    fetchProfile();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto shadow-card">
          <CardHeader>
            <CardTitle className="text-3xl">Profile Settings</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input id="email" type="email" value={email} disabled />
              <p className="text-sm text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
            </div>

            {profile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Member for {formatDistanceToNow(new Date(profile.created_at), { addSuffix: false })}
                </span>
              </div>
            )}

            <Button
              onClick={handleSave}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
