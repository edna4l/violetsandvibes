import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

interface LifestyleStepProps {
  profile: any;
  onUpdate: (updates: any) => void;
}

const LifestyleStep: React.FC<LifestyleStepProps> = ({ profile, onUpdate }) => {
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [openCustomFor, setOpenCustomFor] = useState<string | null>(null);

  const lifestyleCategories = [
    {
      title: 'Relationship',
      options: ['Monogamous', 'Polyamorous', 'Open to both', 'Exploring']
    },
    {
      title: 'Family',
      options: ['Lives with family', 'Has roommates', 'Doesn\'t want children', 'Wants children']
    },
    {
      title: 'Children',
      options: ['Has children', 'Wants children', 'Doesn\'t want children', 'Open to children']
    },
    {
      title: 'Substances',
      options: ['Drinks socially', 'Doesn\'t drink', 'Sober', 'Sober friendly']
    },
    {
      title: 'Spirituality',
      options: ['Spiritual', 'Religious', 'Atheist', 'Agnostic']
    },
    {
      title: 'Wellness',
      options: ['Fitness enthusiast', 'Yoga lover', 'Mental health advocate', 'Meditation practitioner']
    },
    {
      title: 'Interests & Hobbies',
      options: ['Photography', 'Painting', 'Writing', 'Music', 'Dancing', 'Crafting', 'Cooking', 'Theater', 'Poetry', 'Zines']
    },
    {
      title: 'Active',
      options: ['Hiking', 'Yoga', 'Running', 'Swimming', 'Cycling', 'Rock climbing', 'Team sports', 'Roller derby', 'Softball']
    },
    {
      title: 'Entertainment',
      options: ['Gaming', 'Movies', 'TV shows', 'Concerts', 'Comedy shows', 'Board games', 'Drag shows', 'Queer cinema']
    },
    {
      title: 'Learning',
      options: ['Reading', 'Languages', 'Cooking', 'History', 'Science', 'Philosophy', 'Documentaries']
    },
    {
      title: 'Social',
      options: ['Going out', 'Coffee dates', 'Parties', 'Volunteering', 'Networking', 'Pride events', 'Queer meetups']
    },
    {
      title: 'Community',
      options: ['LGBTQ+ organizing', 'Community organizing', 'Mutual aid', 'Mentoring', 'Support groups', 'Political engagement', 'Social justice']
    }
  ];

  const categoryKey = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

  const getCustomOptions = (key: string, categoryTitle?: string, builtInOptions?: string[]): string[] => {
    const currentLifestyle = profile.lifestyle || {};
    const raw = currentLifestyle[`${key}_custom_options`];
    const stored: string[] = Array.isArray(raw)
      ? raw.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];

    if (stored.length > 0) return stored;

    // Fallback: derive custom options from profile.interests if the stored list is empty.
    // This handles profiles where the value was saved to interests but lifestyle_custom_options
    // was not persisted (e.g. older saves or data imported from another path).
    if (categoryTitle && builtInOptions) {
      const builtInSet = new Set(builtInOptions.map(normalize));
      const prefix = `${categoryTitle}:`;
      return (Array.isArray(profile.interests) ? (profile.interests as string[]) : [])
        .filter((i) => typeof i === 'string' && i.startsWith(prefix))
        .map((i) => i.slice(prefix.length))
        .filter((v) => v.length > 0 && !builtInSet.has(normalize(v)));
    }

    return stored;
  };

  const ensureSelected = (category: string, interest: string) => {
    const currentInterests: string[] = Array.isArray(profile.interests) ? profile.interests : [];
    const interestKey = `${category}:${interest}`;
    const nextInterests = currentInterests.includes(interestKey)
      ? currentInterests
      : [...currentInterests, interestKey];

    const currentLifestyle = profile.lifestyle || {};
    const categoryInterests: string[] = Array.isArray(currentLifestyle[category])
      ? currentLifestyle[category]
      : [];
    const nextCategoryInterests = categoryInterests.includes(interest)
      ? categoryInterests
      : [...categoryInterests, interest];

    onUpdate({
      interests: nextInterests,
      lifestyle: {
        ...currentLifestyle,
        [category]: nextCategoryInterests,
      },
    });
  };

  const toggleInterest = (category: string, interest: string) => {
    const currentInterests: string[] = Array.isArray(profile.interests) ? profile.interests : [];
    const interestKey = `${category}:${interest}`;

    const currentLifestyle = profile.lifestyle || {};
    const categoryInterests: string[] = Array.isArray(currentLifestyle[category])
      ? currentLifestyle[category]
      : [];

    const isSelected = currentInterests.includes(interestKey);
    const nextInterests = isSelected
      ? currentInterests.filter((i: string) => i !== interestKey)
      : [...currentInterests, interestKey];
    const nextCategoryInterests = isSelected
      ? categoryInterests.filter((i: string) => i !== interest)
      : [...categoryInterests, interest];

    onUpdate({
      interests: nextInterests,
      lifestyle: {
        ...currentLifestyle,
        [category]: nextCategoryInterests,
      },
    });
  };

  const addCustomOption = (categoryTitle: string, options: string[]) => {
    const key = categoryKey(categoryTitle);
    const rawValue = customInputs[key] ?? '';
    const value = rawValue.replace(/\s+/g, ' ').trim();
    if (!value) return;

    const builtInSet = new Set(options.map((option) => normalize(option)));
    const currentCustomOptions = getCustomOptions(key);
    const customSet = new Set(currentCustomOptions.map((option) => normalize(option)));
    const currentLifestyle = profile.lifestyle || {};

    const nextCustomOptions =
      builtInSet.has(normalize(value)) || customSet.has(normalize(value))
        ? currentCustomOptions
        : [...currentCustomOptions, value];

    onUpdate({
      lifestyle: {
        ...currentLifestyle,
        [`${key}_custom_options`]: nextCustomOptions,
      },
    });

    ensureSelected(categoryTitle, value);
    setCustomInputs((prev) => ({ ...prev, [key]: '' }));
    setOpenCustomFor(null);
  };

  const removeCustomOption = (categoryTitle: string, optionToRemove: string) => {
    const key = categoryKey(categoryTitle);
    const currentLifestyle = profile.lifestyle || {};
    const currentInterests: string[] = Array.isArray(profile.interests) ? profile.interests : [];
    const currentCategoryInterests: string[] = Array.isArray(currentLifestyle[categoryTitle])
      ? currentLifestyle[categoryTitle]
      : [];
    const currentCustomOptions = getCustomOptions(key);
    const normalizedTarget = normalize(optionToRemove);

    const nextCustomOptions = currentCustomOptions.filter(
      (option) => normalize(option) !== normalizedTarget
    );
    const nextCategoryInterests = currentCategoryInterests.filter(
      (option) => normalize(option) !== normalizedTarget
    );
    const nextInterests = currentInterests.filter(
      (interestKey) => normalize(interestKey) !== normalize(`${categoryTitle}:${optionToRemove}`)
    );

    onUpdate({
      interests: nextInterests,
      lifestyle: {
        ...currentLifestyle,
        [categoryTitle]: nextCategoryInterests,
        [`${key}_custom_options`]: nextCustomOptions,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Lifestyle & Values</h2>
        <p className="text-sm text-gray-500">Share what matters to you and how you like to spend your time</p>
      </div>

      {lifestyleCategories.map((category) => {
        const key = categoryKey(category.title);
        const customOptions = getCustomOptions(key, category.title, category.options);
        const optionSet = new Set(category.options.map((option) => normalize(option)));
        const mergedOptions = [
          ...category.options,
          ...customOptions.filter((option) => !optionSet.has(normalize(option))),
        ];

        return (
        <div key={category.title}>
          <h3 className="font-semibold mb-3">{category.title}</h3>
          <div className="grid grid-cols-2 gap-2">
            {mergedOptions.map((option) => {
              const interestKey = `${category.title}:${option}`;
              const isSelected = profile.interests?.includes(interestKey);
              
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className="justify-start text-sm"
                  onClick={() => toggleInterest(category.title, option)}
                >
                  {option}
                </Button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-2 text-sm"
            onClick={() => setOpenCustomFor((prev) => (prev === key ? null : key))}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Custom {category.title}
          </Button>
          {openCustomFor === key && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={customInputs[key] ?? ''}
                onChange={(e) =>
                  setCustomInputs((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={`Add custom ${category.title.toLowerCase()}`}
                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => addCustomOption(category.title, category.options)}
                disabled={!(customInputs[key] ?? '').trim()}
              >
                Add
              </Button>
            </div>
          )}
          {customOptions.length > 0 && (
            <div className="mt-2 space-y-1">
              {customOptions.map((option) => {
                const prefixKey = `${key}_show_prefix_${normalize(option)}`;
                const showPrefix = (profile.lifestyle || {})[prefixKey] !== false;
                return (
                  <div
                    key={`${key}-custom-chip-${option}`}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs text-gray-700 mr-2"
                  >
                    <span>{showPrefix ? `${category.title}: ${option}` : option}</span>
                    <button
                      type="button"
                      title={showPrefix ? 'Show label without category prefix' : 'Show with category prefix'}
                      className="ml-1 text-purple-500 hover:text-purple-700 font-semibold"
                      onClick={() => onUpdate({
                        lifestyle: {
                          ...(profile.lifestyle || {}),
                          [prefixKey]: !showPrefix,
                        }
                      })}
                    >
                      {showPrefix ? category.title.charAt(0) + ':' : '—'}
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500"
                      onClick={() => removeCustomOption(category.title, option)}
                      aria-label={`Remove custom ${category.title} option ${option}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )})}
    </div>
  );
};

export { LifestyleStep };
export default LifestyleStep;
