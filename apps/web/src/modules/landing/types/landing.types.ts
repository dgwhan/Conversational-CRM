import type { ReactNode } from 'react';

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface StatItem {
  value: string;
  numericValue?: number;
  suffix?: string;
  label: string;
  description: string;
  iconName?: string;
}

export interface BentoFeatureItem {
  id: string;
  title: string;
  description: string;
  category: string;
  colSpan?: 'col-span-1' | 'col-span-2' | 'col-span-3';
  badge?: string;
  accentColor: string;
  icon: ReactNode;
  previewType: 'inbox' | 'classification' | 'pipeline' | 'identity' | 'cases' | 'notifications' | 'dashboard' | 'rbac';
}

export interface ProcessStepItem {
  step: number;
  title: string;
  subtitle: string;
  description: string;
  channelTags: string[];
  characterRole: 'cusi' | 'recruiter' | 'student' | 'messenger';
}

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role: string;
  organization: string;
  avatarText: string;
  metricsResult: string;
}

export interface CharacterState {
  mood?: 'idle' | 'waving' | 'celebrating' | 'typing';
  eyeTarget?: { x: number; y: number };
}
