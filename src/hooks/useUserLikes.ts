import { useState, useEffect } from 'react';

export function useUserLikes(userId: string) {
  const [likes, setLikes] = useState<number[]>([]);

  useEffect(() => {
    // Replace this with real fetch logic
    setLikes([]);
  }, [userId]);

  return likes;
}

export default useUserLikes;
