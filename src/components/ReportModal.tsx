import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "spam", label: "Spam or scam" },
  { value: "fake_profile", label: "Fake or misleading profile" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "underage", label: "May be underage" },
  { value: "hate_speech", label: "Hate speech or discrimination" },
  { value: "other", label: "Other" },
] as const;

type ReportReason = typeof REASONS[number]["value"];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  reportedUserId?: string;
  reportedPostId?: string;
  reportedMessageId?: string;
  targetName?: string;
}

const ReportModal: React.FC<ReportModalProps> = ({
  open,
  onClose,
  reportedUserId,
  reportedPostId,
  reportedMessageId,
  targetName = "this",
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setDetails("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId ?? null,
        reported_post_id: reportedPostId ?? null,
        reported_message_id: reportedMessageId ?? null,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;
      toast({
        title: "Report submitted",
        description: "Our safety team will review this. Thank you for keeping the community safe.",
      });
      handleClose();
    } catch (e: any) {
      toast({ title: "Could not submit report", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-violet-950 border-violet-400/30 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Report {targetName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-white/70">Why are you reporting this?</p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all ${
                  reason === r.value
                    ? "border-pink-400/60 bg-pink-500/10"
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-pink-400"
                />
                <span className="text-sm text-white/90">{r.label}</span>
              </label>
            ))}
          </div>

          <Textarea
            placeholder="Optional: add more details…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
            className="bg-violet-900/40 border-violet-400/30 text-white placeholder:text-white/40 resize-none"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="border-white/20 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!reason || submitting}
            className="bg-red-500/80 hover:bg-red-500 text-white border-0"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
