import React from 'react';
import AdvancedFilters from '@/components/AdvancedFilters';

import { ResponsiveWrapper } from '@/components/ResponsiveWrapper';

const FiltersPage: React.FC = () => {
  return (
    <div className="page-calm min-h-screen flex flex-col relative">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <ResponsiveWrapper maxWidth="2xl" className="h-full">
          <div className="glass-pride rounded-2xl overflow-hidden">
            <AdvancedFilters />
          </div>
        </ResponsiveWrapper>
      </div>
    </div>
  );
};
export default FiltersPage;