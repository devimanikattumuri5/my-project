import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, CalendarIcon } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const pollSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  options: z.array(z.string().min(1, "Option cannot be empty")).min(2, "At least 2 options required"),
  resultPassword: z.string().max(100, "Password too long").optional(),
});

const CreatePoll = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [resultPassword, setResultPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date>();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to create polls");
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!data) {
        toast.error("Only admins can create polls");
        navigate("/");
      }
    };

    checkAccess();
  }, [navigate]);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    } else {
      toast.error("Maximum 10 options allowed");
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    } else {
      toast.error("Minimum 2 options required");
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      pollSchema.parse({
        title: title.trim(),
        description: description.trim(),
        options: options.filter((opt) => opt.trim()),
        resultPassword: resultPassword.trim(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please sign in to create polls");
      navigate("/auth");
      return;
    }

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        title: title.trim(),
        description: description.trim(),
        created_by: user.id,
        result_password: resultPassword.trim() || null,
        expires_at: expiresAt?.toISOString() || null,
      })
      .select()
      .single();

    if (pollError) {
      toast.error("Failed to create poll");
      setIsLoading(false);
      return;
    }

    const optionsData = options
      .filter((opt) => opt.trim())
      .map((opt) => ({
        poll_id: poll.id,
        option_text: opt.trim(),
      }));

    const { error: optionsError } = await supabase.from("poll_options").insert(optionsData);

    setIsLoading(false);

    if (optionsError) {
      toast.error("Failed to create poll options");
      return;
    }

    toast.success("Poll created successfully!");
    navigate(`/poll/${poll.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto shadow-card">
          <CardHeader>
            <CardTitle className="text-3xl">Create a New Poll</CardTitle>
            <CardDescription>Ask a question and add options for people to vote on</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Poll Title *</Label>
                <Input
                  id="title"
                  placeholder="What's your question?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add more context to your poll..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resultPassword">Results Password (Optional)</Label>
                <Input
                  id="resultPassword"
                  type="password"
                  placeholder="Set a password to protect results"
                  value={resultPassword}
                  onChange={(e) => setResultPassword(e.target.value)}
                  maxLength={100}
                />
                <p className="text-sm text-muted-foreground">
                  If set, users will need this password to view poll results
                </p>
              </div>

              <div className="space-y-2">
                <Label>Expiration Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiresAt && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {expiresAt ? format(expiresAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={setExpiresAt}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground">
                  Poll will automatically close on this date
                </p>
              </div>

              <div className="space-y-4">
                <Label>Poll Options *</Label>
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      required
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow transition-all"
                disabled={isLoading}
              >
                {isLoading ? "Creating Poll..." : "Create Poll"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatePoll;
