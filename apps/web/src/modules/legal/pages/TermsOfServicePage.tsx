import React from 'react';
import { TERMS_OF_SERVICE_DATA } from '../data/terms.js';
import { LegalLayout } from '../components/LegalLayout.js';

export const TermsOfServicePage: React.FC = () => {
  return <LegalLayout document={TERMS_OF_SERVICE_DATA} />;
};

export default TermsOfServicePage;
