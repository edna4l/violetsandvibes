import React from 'react';
import UserVerification from '@/components/UserVerification';
import { ResponsiveWrapper } from '@/components/ResponsiveWrapper';

const VerificationPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden relative z-10">
        <ResponsiveWrapper maxWidth="2xl" className="h-full">
          <div className="glass-pride rounded-2xl overflow-hidden">
            <UserVerification />
          </div>
        </ResponsiveWrapper>
      </div>
    </div>
  );
};

export default VerificationPage;