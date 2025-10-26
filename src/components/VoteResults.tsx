import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle2 } from "lucide-react";

interface VoteResultsProps {
  options: Array<{
    id: string;
    option_text: string;
    votes_count: number;
  }>;
  selectedOptionId?: string;
}

export const VoteResults = ({ options, selectedOptionId }: VoteResultsProps) => {
  const totalVotes = options.reduce((sum, opt) => sum + opt.votes_count, 0);

  const chartData = options.map((opt) => ({
    name: opt.option_text.length > 20 ? opt.option_text.substring(0, 20) + "..." : opt.option_text,
    votes: opt.votes_count,
  }));

  const COLORS = ["hsl(262, 83%, 58%)", "hsl(252, 100%, 65%)", "hsl(242, 90%, 70%)", "hsl(232, 85%, 65%)"];

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {options.map((option, index) => {
            const percentage = totalVotes > 0 ? Math.round((option.votes_count / totalVotes) * 100) : 0;
            const isSelected = selectedOptionId === option.id;

            return (
              <div key={option.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-medium">{option.option_text}</span>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {option.votes_count} votes ({percentage}%)
                  </span>
                </div>
                <Progress value={percentage} className="h-3" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Visual Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
              <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
