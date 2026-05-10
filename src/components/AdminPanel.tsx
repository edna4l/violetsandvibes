import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, XCircle, RefreshCw, Eye, PauseCircle, Keyboard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface AdminPanelProps {
  user: any;
}

type QueueItem = {
  userId: string;
  name: string;
  username: string | null;
  submittedAt: string;
  underReview: boolean;
  photoStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  idStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  photoUrl: string | null;
  idUrl: string | null;
  profilePhotoUrl?: string | null;
};

type DecisionTarget = 'photo' | 'id' | 'both';
type DecisionType = 'approve' | 'reject';

type RiskLevel = 'green' | 'yellow' | 'red';

function calcRisk(item: QueueItem): RiskLevel {
  const ageHours = (Date.now() - new Date(item.submittedAt).getTime()) / 3_600_000;

  // Red: nothing submitted after 48h wait, or both rejected previously
  if (
    (item.photoStatus === 'pending' && item.idStatus === 'pending' && ageHours > 48) ||
    (item.photoStatus === 'rejected' && item.idStatus === 'rejected')
  ) {
    return 'red';
  }

  // Green: both submitted and complete profile signals
  if (item.photoStatus === 'submitted' && item.idStatus === 'submitted') {
    return 'green';
  }

  // Yellow: only one submitted or older submission
  return 'yellow';
}

const RISK_STYLES: Record<RiskLevel, string> = {
  green:  'border-l-4 border-l-emerald-500 bg-emerald-950/20',
  yellow: 'border-l-4 border-l-amber-400 bg-amber-950/20',
  red:    'border-l-4 border-l-red-500 bg-red-950/20',
};

const RISK_BADGES: Record<RiskLevel, JSX.Element> = {
  green:  <Badge className="bg-emerald-700/80 text-white text-xs">Low Risk</Badge>,
  yellow: <Badge className="bg-amber-600/80 text-white text-xs">Review</Badge>,
  red:    <Badge className="bg-red-700/80 text-white text-xs">High Risk</Badge>,
};

const resolveFunctionErrorMessage = async (error: unknown) => {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;
    try {
      const payload = await error.context.json();
      const details =
        (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : null) ??
        (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : null);

      if (details) return `${details} (HTTP ${status})`;
      return `${error.message} (HTTP ${status})`;
    } catch {
      return `${error.message} (HTTP ${status})`;
    }
  }

  if (error instanceof Error) return error.message;
  return 'Could not load verification queue.';
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ user }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [heldUserIds, setHeldUserIds] = useState<Set<string>>(new Set());
  const [decisionLoadingKey, setDecisionLoadingKey] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;
    void loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const sortedQueue = useMemo(() => {
    const active = queue.filter((item) => !heldUserIds.has(item.userId));
    const riskOrder: Record<RiskLevel, number> = { red: 0, yellow: 1, green: 2 };
    return [...active].sort((a, b) => riskOrder[calcRisk(a)] - riskOrder[calcRisk(b)]);
  }, [queue, heldUserIds]);

  const heldQueue = useMemo(
    () => queue.filter((item) => heldUserIds.has(item.userId)),
    [queue, heldUserIds]
  );

  const pendingPhotoCount = useMemo(
    () => queue.filter((item) => item.photoStatus === 'submitted').length,
    [queue]
  );
  const pendingIdCount = useMemo(
    () => queue.filter((item) => item.idStatus === 'submitted').length,
    [queue]
  );

  const invokeVerificationReview = async (body: Record<string, unknown>) => {
    // Try existing session first; if missing, refresh it once (handles page-reload timing)
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed?.session ?? null;
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      throw new Error('Session not found — please sign out and sign back in.');
    }

    return supabase.functions.invoke('verification-review', {
      body: { ...body, accessToken },
    });
  };

  const loadQueue = async () => {
    if (!user?.id) {
      setQueueLoading(false);
      setQueueError('Session not ready yet. Please refresh.');
      return;
    }

    setQueueLoading(true);
    setQueueError(null);

    let data: any, error: any;
    try {
      ({ data, error } = await invokeVerificationReview({ action: 'list_pending' }));
    } catch (invokeErr) {
      setIsAdmin(true);
      setQueueError((invokeErr as Error)?.message || 'Could not load queue.');
      setQueueLoading(false);
      return;
    }

    if (error) {
      const message = await resolveFunctionErrorMessage(error);
      if (message.toLowerCase().includes('admin access required')) {
        setIsAdmin(false);
        setQueue([]);
        setQueueLoading(false);
        return;
      }

      setIsAdmin(true);
      setQueueError(message);
      setQueue([]);
      setQueueLoading(false);
      return;
    }

    setIsAdmin(true);
    setQueue((data?.items ?? []) as QueueItem[]);
    setQueueLoading(false);
  };

  const handleDecision = async (
    item: QueueItem,
    target: DecisionTarget,
    decision: DecisionType
  ) => {
    const key = `${item.userId}:${target}:${decision}`;
    setDecisionLoadingKey(key);
    try {
      const { data, error } = await invokeVerificationReview({
        action: 'decide',
        targetUserId: item.userId,
        target,
        decision,
      });

      if (error) throw error;

      toast({
        title: decision === 'approve' ? 'Verification approved' : 'Verification rejected',
        description:
          data?.targetUserId === item.userId
            ? `${item.name} was updated successfully.`
            : 'Decision saved.',
      });
    } catch (error) {
      const message = await resolveFunctionErrorMessage(error);
      console.error('Failed to save verification decision:', error);
      toast({
        title: 'Decision failed',
        description: message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDecisionLoadingKey(null);
      await loadQueue();
    }
  };

  const holdItem = (userId: string, name: string) => {
    setHeldUserIds((prev) => new Set([...prev, userId]));
    toast({ title: `${name} moved to Hold` });
  };

  const unholdItem = (userId: string) => {
    setHeldUserIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const openPreview = (url: string | null) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Keyboard shortcuts: A = Approve Both, H = Hold, R = Reject Both
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (sortedQueue.length === 0) return;

      const item = sortedQueue[Math.min(focusedIndex, sortedQueue.length - 1)];
      if (!item) return;

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        void handleDecision(item, 'both', 'approve');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void handleDecision(item, 'both', 'reject');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        holdItem(item.userId, item.name);
        setFocusedIndex((i) => Math.max(0, i));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, sortedQueue.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }
    },
    [sortedQueue, focusedIndex] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isAdmin === false) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="wedding-title text-2xl font-bold rainbow-header">Admin Verification Queue</h1>
          <Badge variant="secondary">{queue.length} pending</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowShortcuts((s) => !s)}
          className="text-xs text-muted-foreground"
        >
          <Keyboard className="h-3 w-3 mr-1" />
          Shortcuts
        </Button>
      </div>

      {showShortcuts && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-3 text-xs text-muted-foreground space-y-1">
            <p><kbd className="px-1 rounded border">A</kbd> Approve Both &nbsp; <kbd className="px-1 rounded border">R</kbd> Reject Both &nbsp; <kbd className="px-1 rounded border">H</kbd> Hold &nbsp; <kbd className="px-1 rounded border">↑↓</kbd> Move focus</p>
            <p>Keyboard actions apply to the focused (outlined) row.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Profiles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queue.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Photo Decisions Needed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPhotoCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ID Decisions Needed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingIdCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Pending Verification Submissions</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadQueue()}
              disabled={queueLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${queueLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {queueLoading && <div className="text-sm text-muted-foreground">Loading verification queue…</div>}
          {queueError && <div className="text-sm text-red-600">{queueError}</div>}
          {!queueLoading && !queueError && sortedQueue.length === 0 && heldQueue.length === 0 && (
            <div className="text-sm text-muted-foreground">No pending verification submissions.</div>
          )}

          {sortedQueue.map((item, idx) => {
            const risk = calcRisk(item);
            const isFocused = idx === focusedIndex;
            const approvePhotoKey = `${item.userId}:photo:approve`;
            const rejectPhotoKey = `${item.userId}:photo:reject`;
            const approveIdKey = `${item.userId}:id:approve`;
            const rejectIdKey = `${item.userId}:id:reject`;
            const approveBothKey = `${item.userId}:both:approve`;
            const rejectBothKey = `${item.userId}:both:reject`;

            return (
              <div
                key={item.userId}
                onClick={() => setFocusedIndex(idx)}
                className={`rounded-lg border p-4 space-y-3 cursor-pointer transition-all ${RISK_STYLES[risk]} ${isFocused ? 'ring-2 ring-purple-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Side-by-side: profile photo + verification photo */}
                  <div className="flex gap-2 shrink-0">
                    {item.profilePhotoUrl ? (
                      <img
                        src={item.profilePhotoUrl}
                        alt="Profile"
                        className="w-14 h-14 rounded-full object-cover border-2 border-purple-400/40"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-purple-900/40 border-2 border-purple-400/20 flex items-center justify-center text-purple-400 text-xl">👤</div>
                    )}
                    {item.photoUrl && (
                      <img
                        src={item.photoUrl}
                        alt="Verification"
                        className="w-14 h-14 rounded object-cover border-2 border-emerald-400/40 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); openPreview(item.photoUrl); }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.username ? `@${item.username}` : item.userId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Submitted {new Date(item.submittedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {RISK_BADGES[risk]}
                    <Badge variant="secondary" className="text-xs">
                      {item.underReview ? 'Under Review' : 'Pending'}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant={item.photoStatus === 'submitted' ? 'default' : 'secondary'}>
                    Photo: {item.photoStatus}
                  </Badge>
                  <Badge variant={item.idStatus === 'submitted' ? 'default' : 'secondary'}>
                    ID: {item.idStatus}
                  </Badge>
                </div>

                {/* Preview buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={!item.photoUrl} onClick={() => openPreview(item.photoUrl)}>
                    <Eye className="h-4 w-4 mr-1" /> Photo
                  </Button>
                  <Button size="sm" variant="outline" disabled={!item.idUrl} onClick={() => openPreview(item.idUrl)}>
                    <Eye className="h-4 w-4 mr-1" /> ID
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400/50 text-amber-400 hover:bg-amber-400/10"
                    onClick={() => holdItem(item.userId, item.name)}
                  >
                    <PauseCircle className="h-4 w-4 mr-1" /> Hold
                  </Button>
                </div>

                {/* Individual approve/reject */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700"
                    disabled={item.photoStatus !== 'submitted' || decisionLoadingKey !== null}
                    onClick={() => void handleDecision(item, 'photo', 'approve')}>
                    {decisionLoadingKey === approvePhotoKey ? 'Saving…' : '✓ Photo'}
                  </Button>
                  <Button size="sm" variant="destructive"
                    disabled={item.photoStatus !== 'submitted' || decisionLoadingKey !== null}
                    onClick={() => void handleDecision(item, 'photo', 'reject')}>
                    {decisionLoadingKey === rejectPhotoKey ? 'Saving…' : '✗ Photo'}
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700"
                    disabled={item.idStatus !== 'submitted' || decisionLoadingKey !== null}
                    onClick={() => void handleDecision(item, 'id', 'approve')}>
                    {decisionLoadingKey === approveIdKey ? 'Saving…' : '✓ ID'}
                  </Button>
                  <Button size="sm" variant="destructive"
                    disabled={item.idStatus !== 'submitted' || decisionLoadingKey !== null}
                    onClick={() => void handleDecision(item, 'id', 'reject')}>
                    {decisionLoadingKey === rejectIdKey ? 'Saving…' : '✗ ID'}
                  </Button>
                </div>

                {/* Approve/Reject Both */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-white/10">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700"
                    disabled={(item.photoStatus !== 'submitted' && item.idStatus !== 'submitted') || decisionLoadingKey !== null}
                    onClick={() => void handleDecision(item, 'both', 'approve')}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {decisionLoadingKey === approveBothKey ? 'Saving…' : 'Approve Both (A)'}
                  </Button>
                  <Button size="sm" variant="destructive"
                    disabled={(item.photoStatus !== 'submitted' && item.idStatus !== 'submitted') || decisionLoadingKey !== null}
                    onClick={() => void handleDecision(item, 'both', 'reject')}>
                    <XCircle className="h-4 w-4 mr-1" />
                    {decisionLoadingKey === rejectBothKey ? 'Saving…' : 'Reject Both (R)'}
                  </Button>
                </div>
              </div>
            );
          })}

          {heldQueue.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-semibold text-amber-400 mb-2">On Hold ({heldQueue.length})</div>
              {heldQueue.map((item) => (
                <div key={item.userId} className="rounded-lg border border-amber-400/30 bg-amber-950/10 p-3 flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.username ? `@${item.username}` : item.userId.slice(0, 8)}</div>
                  </div>
                  <Button size="sm" variant="outline" className="border-amber-400/50 text-amber-400" onClick={() => unholdItem(item.userId)}>
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
