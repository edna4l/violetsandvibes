import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const VIBE_CATEGORIES = [
  { label: 'Introvert Nights',         emoji: '🌙' },
  { label: 'Outdoor Adventures',        emoji: '🌿' },
  { label: 'Safe Travel for Women',     emoji: '✈️' },
  { label: 'Queer Tech Founders',       emoji: '💻' },
  { label: 'Creative Women',            emoji: '🎨' },
  { label: 'Moms & Caregivers',         emoji: '💜' },
  { label: 'Healing & Self-Care',       emoji: '🌸' },
  { label: 'Fitness & Wellness',        emoji: '🏃‍♀️' },
  { label: 'Book Club Vibes',           emoji: '📚' },
  { label: 'Local Sacramento Meetups',  emoji: '📍' },
  { label: 'Women Entrepreneurs',       emoji: '🚀' },
  { label: 'Soft Life & Self-Care Club',emoji: '🧘' },
];

const CONNECTION_INTENT_OPTIONS = [
  { label: 'Friends Only',           emoji: '👯' },
  { label: 'Dating Only',            emoji: '💕' },
  { label: 'Social Only',            emoji: '🎉' },
  { label: 'Community Only',         emoji: '🤝' },
  { label: 'Local Events Only',      emoji: '📍' },
  { label: 'Romantic Interest',      emoji: '💜' },
  { label: 'Women-Only Connections', emoji: '🌸' },
  { label: 'Queer Connections',      emoji: '🏳️‍🌈' },
  { label: 'Open to Everything',     emoji: '✨' },
];

const PROMPTS: Array<{ key: string; placeholder: string }> = [
  { key: 'current_vibe',        placeholder: 'My current vibe is...' },
  { key: 'looking_for_friends', placeholder: 'I am looking for friends who...' },
  { key: 'perfect_weekend',     placeholder: 'My perfect weekend looks like...' },
  { key: 'most_myself',         placeholder: 'I feel most myself when...' },
  { key: 'community',           placeholder: 'A community I would love to be part of is...' },
  { key: 'open_to',             placeholder: 'The kind of connection I am open to is...' },
];

interface VibeProfileStepProps {
  profile: any;
  onUpdate: (updates: any) => void;
}

const VibeProfileStep: React.FC<VibeProfileStepProps> = ({ profile, onUpdate }) => {
  const selectedCategories: string[] = Array.isArray(profile.vibeCategories) ? profile.vibeCategories : [];
  const selectedIntent: string[] = Array.isArray(profile.connectionIntent) ? profile.connectionIntent : [];
  const prompts: Record<string, string> = profile.profilePrompts && typeof profile.profilePrompts === 'object'
    ? profile.profilePrompts
    : {};

  const toggleCategory = (label: string) => {
    const next = selectedCategories.includes(label)
      ? selectedCategories.filter((c) => c !== label)
      : [...selectedCategories, label];
    onUpdate({ vibeCategories: next });
  };

  const toggleIntent = (label: string) => {
    const next = selectedIntent.includes(label)
      ? selectedIntent.filter((i) => i !== label)
      : [...selectedIntent, label];
    onUpdate({ connectionIntent: next });
  };

  const updatePrompt = (key: string, value: string) => {
    onUpdate({ profilePrompts: { ...prompts, [key]: value } });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Your Vibe Profile</h2>
        <p className="text-sm text-gray-500">Help others find you through shared interests and intentions</p>
      </div>

      {/* Vibe Categories */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700">Vibe Categories</label>
        <p className="text-xs text-gray-500 mb-3">Select all that feel like you. These show on your profile and help with discovery.</p>
        <div className="grid grid-cols-2 gap-2">
          {VIBE_CATEGORIES.map((cat) => (
            <Button
              key={cat.label}
              type="button"
              variant={selectedCategories.includes(cat.label) ? 'default' : 'outline'}
              className="justify-start text-left h-auto py-2 px-3"
              onClick={() => toggleCategory(cat.label)}
            >
              <span className="mr-2 shrink-0">{cat.emoji}</span>
              <span className="text-xs leading-tight">{cat.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Connection Intent */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700">Connection Intent</label>
        <p className="text-xs text-gray-500 mb-3">What kind of connection are you open to? Select all that apply.</p>
        <div className="grid grid-cols-2 gap-2">
          {CONNECTION_INTENT_OPTIONS.map((opt) => (
            <Button
              key={opt.label}
              type="button"
              variant={selectedIntent.includes(opt.label) ? 'default' : 'outline'}
              className="justify-start text-left h-auto py-2 px-3"
              onClick={() => toggleIntent(opt.label)}
            >
              <span className="mr-2 shrink-0">{opt.emoji}</span>
              <span className="text-xs leading-tight">{opt.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Profile Prompts */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700">Vibe Prompts</label>
        <p className="text-xs text-gray-500 mb-3">Answer a few — they make your profile warmer and easier to connect with.</p>
        <div className="space-y-3">
          {PROMPTS.map((p) => (
            <Textarea
              key={p.key}
              placeholder={p.placeholder}
              value={prompts[p.key] || ''}
              onChange={(e) => updatePrompt(p.key, e.target.value)}
              maxLength={280}
              rows={2}
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none text-sm"
            />
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-xs text-gray-600 leading-relaxed">
        <span className="font-semibold text-purple-700">About this space: </span>
        Violets & Vibes is a women-centered and trans-inclusive community for friendship, dating, and belonging.
        We welcome cis women, trans women, lesbian, bisexual, pansexual, queer, and gender-diverse people who belong here.
      </div>
    </div>
  );
};

export { VibeProfileStep };
export default VibeProfileStep;
