import React from 'react';
import { PRIVACY_POLICY_DATA } from '../data/privacy.js';
import { LegalLayout } from '../components/LegalLayout.js';

export const PrivacyPolicyPage: React.FC = () => {
  return <LegalLayout document={PRIVACY_POLICY_DATA} />;
};

export default PrivacyPolicyPage;
