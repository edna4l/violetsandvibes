import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface LifestyleStepProps {
  profile: any;
  onUpdate: (updates: any) => void;
}

const LifestyleStep: React.FC<LifestyleStepProps> = ({ profile, onUpdate }) => {
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

  const toggleInterest = (category: string, interest: string) => {
    const currentInterests = profile.interests || [];
    const interestKey = `${category}:${interest}`;
    
    if (currentInterests.includes(interestKey)) {
      onUpdate({
        interests: currentInterests.filter((i: string) => i !== interestKey)
      });
    } else {
      onUpdate({
        interests: [...currentInterests, interestKey]
      });
    }

    // Also update lifestyle object for better data structure
    const currentLifestyle = profile.lifestyle || {};
    const categoryInterests = currentLifestyle[category] || [];
    
    if (categoryInterests.includes(interest)) {
      onUpdate({
        lifestyle: {
          ...currentLifestyle,
          [category]: categoryInterests.filter((i: string) => i !== interest)
        }
      });
    } else {
      onUpdate({
        lifestyle: {
          ...currentLifestyle,
          [category]: [...categoryInterests, interest]
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Lifestyle & Values</h2>
        <p className="text-sm text-white/70">Share what matters to you and how you like to spend your time</p>
      </div>

      {lifestyleCategories.map((category) => (
        <div key={category.title}>
          <h3 className="font-semibold mb-3">{category.title}</h3>
          <div className="grid grid-cols-2 gap-2">
            {category.options.map((option) => {
              const interestKey = `${category.title}:${option}`;
              const isSelected = profile.interests?.includes(interestKey);
              
              return (
                <Button
                  key={option}
                  variant={isSelected ? "default" : "outline"}
                  className="justify-start text-sm"
                  onClick={() => toggleInterest(category.title, option)}
                >
                  {option}
                </Button>
              );
            })}
          </div>
          <Button variant="ghost" className="mt-2 text-sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Custom {category.title}
          </Button>
        </div>
      ))}
    </div>
  );
};

export { LifestyleStep };
export default LifestyleStep;
