import { supabase } from '@/lib/supabase';
import type { SubscriptionTier } from '@/types/subscription';

const TIER_ORDER: Record<SubscriptionTier, number> = {
  free: 0,
  premium: 1,
  elite: 2,
};
const ADMIN_BYPASS_TIER: SubscriptionTier = 'elite';
const adminStatusCache = new Map<string, boolean>();

function normalizeTier(value: unknown): SubscriptionTier | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();

  if (normalized === 'free' || normalized === 'basic') return 'free';
  if (normalized === 'premium' || normalized === 'pro' || normalized === 'plus') return 'premium';
  if (normalized === 'elite' || normalized === 'vip' || normalized === 'platinum') return 'elite';

  return null;
}

function tierFromObject(source: unknown): SubscriptionTier | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const obj = source as Record<string, unknown>;

  const candidates: unknown[] = [
    obj.subscription_tier,
    obj.subscriptionTier,
    obj.tier,
    obj.plan_tier,
    obj.planTier,
    (obj.subscription as Record<string, unknown> | undefined)?.tier,
    (obj.violets_verified as Record<string, unknown> | undefined)?.subscription_tier,
    (obj.violets_verified as Record<string, unknown> | undefined)?.tier,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeTier(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function maxTier(a: SubscriptionTier, b: SubscriptionTier): SubscriptionTier {
  return TIER_ORDER[a] >= TIER_ORDER[b] ? a : b;
}

export function resolveSubscriptionTier(...sources: unknown[]): SubscriptionTier {
  let resolved: SubscriptionTier = 'free';
  for (const source of sources) {
    const next = tierFromObject(source);
    if (next) {
      resolved = maxTier(resolved, next);
    }
  }
  return resolved;
}

export async function isAdminBypassUser(
  userId: string,
  options: { forceRefresh?: boolean } = {}
): Promise<boolean> {
  if (!options.forceRefresh && adminStatusCache.has(userId)) {
    return adminStatusCache.get(userId) === true;
  }

  const { data, error } = await supabase
    .from('admin_roles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Admin bypass lookup failed:', error.message);
    adminStatusCache.set(userId, false);
    return false;
  }

  const isAdmin = !!data;
  adminStatusCache.set(userId, isAdmin);
  return isAdmin;
}

export function applyAdminBypassTier(baseTier: SubscriptionTier, isAdminBypass: boolean) {
  return isAdminBypass ? ADMIN_BYPASS_TIER : baseTier;
}

export async function loadSubscriptionTierForUser(userId: string): Promise<SubscriptionTier> {
  const { data, error } = await supabase
    .from('profiles')
    .select('privacy_settings, safety_settings')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  const privacySettings =
    data?.privacy_settings && typeof data.privacy_settings === 'object'
      ? (data.privacy_settings as Record<string, unknown>)
      : {};

  const safetySettings =
    data?.safety_settings && typeof data.safety_settings === 'object'
      ? (data.safety_settings as Record<string, unknown>)
      : {};

  return resolveSubscriptionTier(privacySettings, safetySettings);
}

export async function loadEffectiveSubscriptionTierForUser(userId: string): Promise<SubscriptionTier> {
  const [baseTier, isAdmin] = await Promise.all([
    loadSubscriptionTierForUser(userId),
    isAdminBypassUser(userId),
  ]);
  return applyAdminBypassTier(baseTier, isAdmin);
}

export async function saveSubscriptionTierForUser(userId: string, tier: SubscriptionTier) {
  const { data: existing, error: loadError } = await supabase
    .from('profiles')
    .select('privacy_settings, safety_settings')
    .eq('id', userId)
    .maybeSingle();

  if (loadError) throw loadError;

  const privacySettings =
    existing?.privacy_settings && typeof existing.privacy_settings === 'object'
      ? (existing.privacy_settings as Record<string, unknown>)
      : {};

  const safetySettings =
    existing?.safety_settings && typeof existing.safety_settings === 'object'
      ? (existing.safety_settings as Record<string, unknown>)
      : {};

  const currentVioletsVerified =
    privacySettings.violets_verified && typeof privacySettings.violets_verified === 'object'
      ? (privacySettings.violets_verified as Record<string, unknown>)
      : {};

  const nextPrivacySettings = {
    ...privacySettings,
    subscription_tier: tier,
    subscriptionTier: tier,
    violets_verified: {
      ...currentVioletsVerified,
      subscription_tier: tier,
      tier,
    },
  };

  const nextSafetySettings = {
    ...safetySettings,
    subscription_tier: tier,
    subscriptionTier: tier,
    violets_verified_unlocked: tier !== 'free',
  };

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      privacy_settings: nextPrivacySettings,
      safety_settings: nextSafetySettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id')
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) throw new Error('Profile record not found');
}
