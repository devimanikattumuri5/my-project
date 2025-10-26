import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { VoteResults } from "@/components/VoteResults";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Clock, Trash2, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
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

interface PollOption {
  id: string;
  option_text: string;
  votes_count: number;
}

interface Poll {
  id: string;
  title: string;
  description: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
  result_password: string | null;
  expires_at: string | null;
  profiles: {
    username: string;
  };
}

const PollDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchPollDetails();
    checkUserVote();

    const channel = supabase
      .channel(`poll-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_options",
          filter: `poll_id=eq.${id}`,
        },
        () => {
          fetchOptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchPollDetails = async () => {
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Poll not found");
      navigate("/");
      return;
    }

    // Fetch profile separately
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", data.created_by)
      .single();

    setPoll({
      ...data,
      profiles: profile || { username: "Anonymous" },
    });
    await fetchOptions();
    setIsLoading(false);
  };

  const fetchOptions = async () => {
    const { data } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", id)
      .order("created_at");

    if (data) {
      setOptions(data);
    }
  };

  const checkUserVote = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (user) {
      setCurrentUserId(user.id);
      
      // Check admin status
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      setIsAdmin(!!roleData);
      
      const { data } = await supabase
        .from("votes")
        .select("option_id")
        .eq("poll_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setHasVoted(true);
        setSelectedOption(data.option_id);
      }
    }
  };

  const handleVote = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please sign in to vote");
      navigate("/auth");
      return;
    }

    if (!selectedOption) {
      toast.error("Please select an option");
      return;
    }

    setIsVoting(true);

    const { error } = await supabase.from("votes").insert({
      poll_id: id,
      option_id: selectedOption,
      user_id: user.id,
    });

    setIsVoting(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("You have already voted on this poll");
      } else {
        toast.error("Failed to submit vote");
      }
      return;
    }

    setHasVoted(true);
    toast.success("Vote submitted successfully!");
    await fetchOptions();
  };

  const handleDeletePoll = async () => {
    const { error } = await supabase.from("polls").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete poll");
      return;
    }

    toast.success("Poll deleted successfully");
    navigate("/");
  };

  const handlePasswordSubmit = () => {
    if (poll?.result_password && passwordInput === poll.result_password) {
      setIsPasswordVerified(true);
      toast.success("Access granted");
    } else {
      toast.error("Incorrect password");
      setPasswordInput("");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  const totalVotes = options.reduce((sum, opt) => sum + opt.votes_count, 0);
  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const needsPassword = poll.result_password && hasVoted && !isPasswordVerified;
  const canViewResults = hasVoted && (!poll.result_password || isPasswordVerified);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{poll.title}</CardTitle>
                  <CardDescription className="text-base">{poll.description}</CardDescription>
                </div>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Poll</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this poll? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePoll}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{poll.profiles?.username || "Anonymous"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}</span>
                </div>
                <span>•</span>
                <span>
                  {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                </span>
                {poll.expires_at && (
                  <>
                    <span>•</span>
                    <span className={isExpired ? "text-destructive" : ""}>
                      {isExpired ? "Expired" : `Expires ${formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}`}
                    </span>
                  </>
                )}
              </div>
            </CardHeader>
          </Card>

          {!hasVoted ? (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Cast Your Vote</CardTitle>
                {isExpired && (
                  <CardDescription className="text-destructive">
                    This poll has expired and is no longer accepting votes
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedOption} onValueChange={setSelectedOption} disabled={isExpired}>
                  <div className="space-y-3">
                    {options.map((option) => (
                      <div
                        key={option.id}
                        className={cn(
                          "flex items-center space-x-3 p-4 rounded-lg border border-border transition-colors",
                          !isExpired && "hover:bg-accent"
                        )}
                      >
                        <RadioGroupItem value={option.id} id={option.id} disabled={isExpired} />
                        <Label htmlFor={option.id} className={cn("flex-1", !isExpired && "cursor-pointer")}>
                          {option.option_text}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                <Button
                  onClick={handleVote}
                  className="w-full mt-6 bg-gradient-primary hover:shadow-glow transition-all"
                  disabled={isVoting || !selectedOption || isExpired}
                >
                  {isVoting ? "Submitting..." : isExpired ? "Poll Expired" : "Submit Vote"}
                </Button>
              </CardContent>
            </Card>
          ) : needsPassword ? (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Results Protected
                </CardTitle>
                <CardDescription>
                  Enter the password to view poll results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
                />
                <Button
                  onClick={handlePasswordSubmit}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all"
                >
                  View Results
                </Button>
              </CardContent>
            </Card>
          ) : canViewResults ? (
            <VoteResults options={options} selectedOptionId={selectedOption} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PollDetails;
