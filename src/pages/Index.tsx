import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { PollCard } from "@/components/PollCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Vote, TrendingUp, Users, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Poll {
  id: string;
  title: string;
  description: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  profiles: {
    username: string;
  };
  poll_options: Array<{
    id: string;
    option_text: string;
    votes_count: number;
  }>;
}

const Index = () => {
  const navigate = useNavigate();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPolls();

    const channel = supabase
      .channel("polls-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "polls",
        },
        () => {
          fetchPolls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPolls = async () => {
    const { data, error } = await supabase
      .from("polls")
      .select(
        `
        *,
        poll_options (id, option_text, votes_count)
      `
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch profiles separately
      const pollsWithProfiles = await Promise.all(
        data.map(async (poll) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", poll.created_by)
            .single();

          return {
            ...poll,
            profiles: profile || { username: "Anonymous" },
          };
        })
      );
      setPolls(pollsWithProfiles as Poll[]);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow animate-pulse">
              <Vote className="h-16 w-16 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Create Polls, Get Instant Feedback
          </h1>
          <p className="text-xl text-muted-foreground">
            The simplest way to gather opinions and make decisions together
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/create")}
              className="bg-gradient-primary hover:shadow-glow transition-all text-lg px-8"
            >
              Create Your First Poll
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 bg-accent rounded-xl">
                <TrendingUp className="h-8 w-8 text-accent-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">Real-time Results</h3>
            <p className="text-muted-foreground">See votes update instantly as people participate</p>
          </div>
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 bg-accent rounded-xl">
                <Users className="h-8 w-8 text-accent-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">Easy Sharing</h3>
            <p className="text-muted-foreground">Share polls with anyone, anywhere</p>
          </div>
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 bg-accent rounded-xl">
                <BarChart3 className="h-8 w-8 text-accent-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">Beautiful Charts</h3>
            <p className="text-muted-foreground">Visualize results with stunning graphics</p>
          </div>
        </div>
      </section>

      {/* Active Polls Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Active Polls</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                </div>
              ))}
            </>
          ) : polls.length > 0 ? (
            polls.map((poll) => <PollCard key={poll.id} poll={poll} />)
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">No active polls yet. Be the first to create one!</p>
              <Button
                onClick={() => navigate("/create")}
                className="mt-4 bg-gradient-primary hover:shadow-glow transition-all"
              >
                Create Poll
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
