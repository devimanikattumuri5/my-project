import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PollCardProps {
  poll: {
    id: string;
    title: string;
    description: string;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
    profiles: {
      username: string;
    };
    poll_options: Array<{
      votes_count: number;
    }>;
  };
}

export const PollCard = ({ poll }: PollCardProps) => {
  const navigate = useNavigate();
  const totalVotes = poll.poll_options.reduce((sum, option) => sum + option.votes_count, 0);
  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();

  return (
    <Card 
      className="bg-gradient-card hover:shadow-glow transition-all duration-300 cursor-pointer group border-border/50"
      onClick={() => navigate(`/poll/${poll.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
            {poll.title}
          </CardTitle>
          <div className="flex gap-2 shrink-0">
            {poll.is_active && !isExpired && (
              <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>
            )}
            {isExpired && (
              <Badge variant="destructive">Expired</Badge>
            )}
          </div>
        </div>
        <CardDescription className="line-clamp-2">{poll.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{poll.profiles?.username || "Anonymous"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </span>
          <Button
            size="sm"
            className="bg-gradient-primary hover:shadow-glow transition-all"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/poll/${poll.id}`);
            }}
          >
            View Poll
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
