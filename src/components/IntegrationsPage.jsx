/**
 * IntegrationsPage
 * 
 * Admin-only page for managing external service integrations via Pipedream Connect.
 * Features official brand logos, connected app management, and exploration of available integrations.
 */

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { useIntegrations } from '@/hooks/useIntegrations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { formatDataTimestamp } from '@/lib/api';

// ============================================================================
// Official Brand Logos - High-quality SVG representations
// ============================================================================

const QuickBooksLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#2CA01C"/>
    <path d="M14 17C14 15.3431 15.3431 14 17 14H20C22.7614 14 25 16.2386 25 19V29C25 30.6569 23.6569 32 22 32H19C16.2386 32 14 29.7614 14 27V17Z" fill="white"/>
    <path d="M23 19C23 16.2386 25.2386 14 28 14H31C32.6569 14 34 15.3431 34 17V27C34 29.7614 31.7614 32 29 32H26C24.3431 32 23 30.6569 23 29V19Z" fill="white"/>
    <circle cx="19" cy="24" r="2.5" fill="#2CA01C"/>
    <circle cx="29" cy="24" r="2.5" fill="#2CA01C"/>
  </svg>
);

const StripeLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#635BFF"/>
    <path d="M22.165 19.33C22.165 18.08 23.215 17.53 25.025 17.53C27.435 17.53 30.475 18.28 32.885 19.51V13.14C30.235 12.09 27.625 11.64 25.025 11.64C19.085 11.64 15.165 14.59 15.165 19.59C15.165 27.39 25.41 26.095 25.41 29.475C25.41 30.925 24.125 31.45 22.215 31.45C19.595 31.45 16.22 30.45 13.55 29.05V35.525C16.52 36.78 19.545 37.33 22.215 37.33C28.305 37.33 32.465 34.475 32.465 29.395C32.44 20.92 22.165 22.475 22.165 19.33Z" fill="white"/>
  </svg>
);

const GoogleSheetsLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M29.5 8H14C11.79 8 10 9.79 10 12V36C10 38.21 11.79 40 14 40H34C36.21 40 38 38.21 38 36V16.5L29.5 8Z" fill="#0F9D58"/>
    <path d="M29.5 8V16.5H38L29.5 8Z" fill="#87CEAC"/>
    <rect x="14" y="22" width="20" height="14" rx="1" fill="white"/>
    <line x1="14" y1="26" x2="34" y2="26" stroke="#0F9D58" strokeWidth="1"/>
    <line x1="14" y1="30" x2="34" y2="30" stroke="#0F9D58" strokeWidth="1"/>
    <line x1="14" y1="34" x2="34" y2="34" stroke="#0F9D58" strokeWidth="1"/>
    <line x1="21" y1="22" x2="21" y2="36" stroke="#0F9D58" strokeWidth="1"/>
    <line x1="28" y1="22" x2="28" y2="36" stroke="#0F9D58" strokeWidth="1"/>
  </svg>
);

const SlackLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="white"/>
    <path d="M18.5 27C18.5 28.933 16.933 30.5 15 30.5C13.067 30.5 11.5 28.933 11.5 27C11.5 25.067 13.067 23.5 15 23.5H18.5V27Z" fill="#E01E5A"/>
    <path d="M20.25 27C20.25 25.067 21.817 23.5 23.75 23.5C25.683 23.5 27.25 25.067 27.25 27V33C27.25 34.933 25.683 36.5 23.75 36.5C21.817 36.5 20.25 34.933 20.25 33V27Z" fill="#E01E5A"/>
    <path d="M23.75 18.5C21.817 18.5 20.25 16.933 20.25 15C20.25 13.067 21.817 11.5 23.75 11.5C25.683 11.5 27.25 13.067 27.25 15V18.5H23.75Z" fill="#36C5F0"/>
    <path d="M23.75 20.25C25.683 20.25 27.25 21.817 27.25 23.75C27.25 25.683 25.683 27.25 23.75 27.25H17.75C15.817 27.25 14.25 25.683 14.25 23.75C14.25 21.817 15.817 20.25 17.75 20.25H23.75Z" fill="#36C5F0"/>
    <path d="M32.25 23.75C32.25 21.817 33.817 20.25 35.75 20.25C37.683 20.25 39.25 21.817 39.25 23.75C39.25 25.683 37.683 27.25 35.75 27.25H32.25V23.75Z" fill="#2EB67D"/>
    <path d="M30.5 23.75C30.5 25.683 28.933 27.25 27 27.25C25.067 27.25 23.5 25.683 23.5 23.75V17.75C23.5 15.817 25.067 14.25 27 14.25C28.933 14.25 30.5 15.817 30.5 17.75V23.75Z" fill="#2EB67D"/>
    <path d="M27 32.25C28.933 32.25 30.5 33.817 30.5 35.75C30.5 37.683 28.933 39.25 27 39.25C25.067 39.25 23.5 37.683 23.5 35.75V32.25H27Z" fill="#ECB22E"/>
    <path d="M27 30.5C25.067 30.5 23.5 28.933 23.5 27C23.5 25.067 25.067 23.5 27 23.5H33C34.933 23.5 36.5 25.067 36.5 27C36.5 28.933 34.933 30.5 33 30.5H27Z" fill="#ECB22E"/>
  </svg>
);

const HubSpotLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#FF7A59"/>
    <path d="M31.5 18.5V14.5C32.33 14.08 32.88 13.22 32.88 12.25C32.88 10.87 31.76 9.75 30.38 9.75C29 9.75 27.88 10.87 27.88 12.25C27.88 13.22 28.43 14.08 29.25 14.5V18.5C27.4 18.89 25.73 19.88 24.5 21.27L15.5 14.5C15.56 14.22 15.63 13.94 15.63 13.63C15.63 11.7 14.05 10.13 12.13 10.13C10.2 10.13 8.63 11.7 8.63 13.63C8.63 15.55 10.2 17.13 12.13 17.13C12.65 17.13 13.14 17.01 13.58 16.79L22.21 23.28C21.59 24.33 21.25 25.54 21.25 26.83C21.25 30.87 24.52 34.14 28.56 34.14C30.24 34.14 31.79 33.58 33.05 32.63L36.05 35.63C35.79 36.07 35.63 36.58 35.63 37.13C35.63 38.51 36.75 39.63 38.13 39.63C39.5 39.63 40.63 38.51 40.63 37.13C40.63 35.75 39.5 34.63 38.13 34.63C37.58 34.63 37.07 34.79 36.63 35.05L33.63 32.05C34.83 30.68 35.56 28.88 35.56 26.91C35.56 22.87 32.29 19.6 28.25 19.6C27.38 19.6 26.54 19.74 25.77 20L26 19.68C27.15 18.4 28.72 17.55 30.5 17.2V18.5H31.5ZM28.44 31.44C26.01 31.44 24.03 29.46 24.03 27.03C24.03 24.59 26.01 22.61 28.44 22.61C30.88 22.61 32.86 24.59 32.86 27.03C32.86 29.46 30.88 31.44 28.44 31.44Z" fill="white"/>
  </svg>
);

const SalesforceLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#00A1E0"/>
    <path d="M20.5 14C18.57 14 16.85 14.88 15.73 16.26C14.81 15.47 13.61 15 12.3 15C9.38 15 7 17.38 7 20.3C7 20.53 7.02 20.75 7.05 20.97C5.78 21.9 5 23.38 5 25C5 27.76 7.24 30 10 30H14.89C15.17 31.72 16.66 33 18.5 33C20.34 33 21.83 31.72 22.11 30H25.89C26.17 31.72 27.66 33 29.5 33C31.34 33 32.83 31.72 33.11 30H38C40.76 30 43 27.76 43 25C43 22.59 41.28 20.56 39 20.1C39 17.28 36.72 15 33.9 15C32.76 15 31.71 15.4 30.88 16.05C29.78 14.8 28.2 14 26.5 14C24.95 14 23.53 14.63 22.47 15.65C21.58 14.63 20.31 14 18.9 14C18.77 14 18.63 14 18.5 14.01C18.37 14 18.23 14 18.1 14C18.2 14 20.5 14 20.5 14Z" fill="white"/>
  </svg>
);

const NotionLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="white" stroke="#E5E5E5" strokeWidth="1"/>
    <path d="M13.46 10.09L30.46 8.5C32.36 8.33 32.86 8.43 34.06 9.33L39.66 13.43C40.46 14.03 40.76 14.23 40.76 15.03V36.43C40.76 37.83 40.26 38.63 38.46 38.73L18.16 40C16.76 40.1 16.16 39.8 15.26 38.63L10.66 32.43C9.66 31.13 9.26 30.23 9.26 29.03V12.63C9.26 11.13 9.86 10.23 11.66 10.09H13.46Z" fill="white"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M30.46 8.5L13.46 10.09H11.66C9.86 10.23 9.26 11.13 9.26 12.63V29.03C9.26 30.23 9.66 31.13 10.66 32.43L15.26 38.63C16.16 39.8 16.76 40.1 18.16 40L38.46 38.73C40.26 38.63 40.76 37.83 40.76 36.43V15.03C40.76 14.23 40.46 14.03 39.66 13.43L34.06 9.33C32.86 8.43 32.36 8.33 30.46 8.5ZM18.76 14.23C17.16 14.33 16.86 14.36 15.86 13.53L13.16 11.43C12.86 11.13 12.96 10.79 13.66 10.73L29.66 9.23C31.36 9.03 32.26 9.53 33.16 10.23L36.56 12.73C36.76 12.86 37.16 13.23 36.86 13.23L19.66 14.13L18.76 14.23ZM16.96 36.83V17.13C16.96 16.33 17.26 15.93 17.96 15.86L37.06 14.73C37.66 14.66 37.96 15.06 37.96 15.86V35.43C37.96 36.23 37.86 36.73 36.86 36.83L18.36 37.83C17.36 37.93 16.96 37.53 16.96 36.83ZM34.26 18.43C34.46 19.13 34.26 19.83 33.56 19.93L32.36 20.13V33.23C31.26 33.83 30.26 34.13 29.36 34.13C27.96 34.13 27.56 33.73 26.46 32.33L22.16 25.63V32.03L24.26 32.53C24.26 32.53 24.26 34.03 22.36 34.03L18.86 34.23C18.66 33.83 18.86 33.03 19.36 32.93L20.36 32.63V22.73L18.86 22.53C18.66 21.83 19.06 20.83 20.06 20.73L23.86 20.43L28.36 27.33V21.43L26.66 21.23C26.46 20.43 27.06 19.73 27.96 19.63L34.26 18.43Z" fill="black"/>
  </svg>
);

const AirtableLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#FCB400"/>
    <path d="M23.1 10.2L11.1 14.7C10.2 15.1 10.2 16.3 11.1 16.7L23.3 21.3C23.8 21.5 24.3 21.5 24.8 21.3L37 16.7C37.9 16.3 37.9 15.1 37 14.7L24.8 10.2C24.3 10 23.6 10 23.1 10.2Z" fill="white"/>
    <path d="M25.4 24V36.7C25.4 37.5 26.1 38 26.9 37.7L39.4 32.7C39.8 32.5 40.1 32.1 40.1 31.7V18.9C40.1 18.1 39.4 17.6 38.6 17.9L26.1 22.9C25.7 23.2 25.4 23.5 25.4 24Z" fill="#18BFFF"/>
    <path d="M22.5 24.6V36.8C22.5 37.7 21.5 38.2 20.7 37.7L8.6 30.9C8.2 30.7 8 30.2 8 29.8V17.5C8 16.6 9 16.1 9.8 16.6L21.9 23.5C22.3 23.7 22.5 24.1 22.5 24.6Z" fill="#F82B60"/>
  </svg>
);

const ZapierLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#FF4A00"/>
    <path d="M28.24 19.76L32 24L28.24 28.24L24 32L19.76 28.24L16 24L19.76 19.76L24 16L28.24 19.76ZM24 27.17L27.17 24L24 20.83L20.83 24L24 27.17Z" fill="white"/>
    <path d="M24 9L26.12 14.88H32.36L27.12 18.74L29.24 24.62L24 20.76L18.76 24.62L20.88 18.74L15.64 14.88H21.88L24 9Z" fill="white"/>
    <path d="M24 39L21.88 33.12H15.64L20.88 29.26L18.76 23.38L24 27.24L29.24 23.38L27.12 29.26L32.36 33.12H26.12L24 39Z" fill="white"/>
    <path d="M9 24L14.88 21.88V15.64L18.74 20.88L24.62 18.76L20.76 24L24.62 29.24L18.74 27.12L14.88 32.36V26.12L9 24Z" fill="white"/>
    <path d="M39 24L33.12 26.12V32.36L29.26 27.12L23.38 29.24L27.24 24L23.38 18.76L29.26 20.88L33.12 15.64V21.88L39 24Z" fill="white"/>
  </svg>
);

const MailchimpLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#FFE01B"/>
    <path d="M33.5 20C33.5 20 34.5 18.5 33 17C31.5 15.5 30 16.5 30 16.5C30 16.5 28.5 14 25.5 14C21 14 18 18.5 18 23C18 27.5 21 32 25.5 32C28.5 32 30 30.5 30 30.5L31 33H35V21C35 21 34 20.5 33.5 20Z" fill="#000"/>
    <circle cx="25" cy="23" r="5" fill="#FFE01B"/>
    <circle cx="23" cy="22" r="1.5" fill="#000"/>
    <path d="M27 25C27 25 26 26 25 26C24 26 23 25 23 25" stroke="#000" strokeWidth="1" strokeLinecap="round"/>
    <path d="M14 24C14 24 13 22 14 20C15 18 17 18 17 18" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PipedreamLogo = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#1B1B1B"/>
    <path d="M12 18H16V30H12V18Z" fill="#00D084"/>
    <path d="M19 14H23V34H19V14Z" fill="#00D084"/>
    <path d="M26 20H30V28H26V20Z" fill="#00D084"/>
    <path d="M33 16H37V32H33V16Z" fill="#00D084"/>
  </svg>
);

const GenericAppLogo = ({ className = "w-10 h-10", name = "App" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#6366F1"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
      {name.charAt(0).toUpperCase()}
    </text>
  </svg>
);

// Logo mapping
const APP_LOGOS = {
  quickbooks: QuickBooksLogo,
  stripe: StripeLogo,
  google_sheets: GoogleSheetsLogo,
  slack: SlackLogo,
  hubspot: HubSpotLogo,
  salesforce: SalesforceLogo,
  notion: NotionLogo,
  airtable: AirtableLogo,
  zapier: ZapierLogo,
  mailchimp: MailchimpLogo,
  pipedream: PipedreamLogo,
};

// ============================================================================
// Available Integrations for "Explore" Section
// ============================================================================

const EXPLORE_INTEGRATIONS = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    description: 'Sync contacts, deals, and marketing data',
    comingSoon: true,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    description: 'Enterprise CRM integration',
    comingSoon: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Productivity',
    description: 'Database and documentation sync',
    comingSoon: true,
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'Database',
    description: 'Flexible database integration',
    comingSoon: true,
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'Marketing',
    description: 'Email marketing automation',
    comingSoon: true,
  },
];

// ============================================================================
// Icons
// ============================================================================

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const PlugIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-5"/>
    <path d="M9 8V2"/>
    <path d="M15 8V2"/>
    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>
  </svg>
);

const UnplugIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 5 3-3"/>
    <path d="m2 22 3-3"/>
    <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/>
    <path d="M7.5 13.5 10 11"/>
    <path d="M10.5 16.5 13 14"/>
    <path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>
  </svg>
);

const PlayIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 20 12 6 21 6 3"/>
  </svg>
);

const CheckCircleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const XCircleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const AlertCircleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const LoaderIcon = ({ className = "w-4 h-4" }) => (
  <svg className={`${className} animate-spin`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const ArrowLeftIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

const ExternalLinkIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const GridIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const SparklesIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  </svg>
);

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG = {
  connected: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    icon: CheckCircleIcon,
    label: 'Connected',
  },
  active: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    icon: CheckCircleIcon,
    label: 'Active',
  },
  disconnected: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-500',
    dot: 'bg-slate-400',
    icon: UnplugIcon,
    label: 'Not Connected',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
    icon: XCircleIcon,
    label: 'Error',
  },
};

// ============================================================================
// Integration Card Component
// ============================================================================

const IntegrationCard = ({ connection, onConnect, onDisconnect, onSync, onTest }) => {
  const [testResult, setTestResult] = useState(null);
  const { app, app_name, description, status, connected_at, last_sync, pending } = connection;
  
  const LogoComponent = APP_LOGOS[app] || ((props) => <GenericAppLogo {...props} name={app_name} />);
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
  const StatusIcon = statusConfig.icon;
  const isConnected = status === 'connected' || status === 'active';
  const isPending = !!pending;
  
  const handleTest = async () => {
    const result = await onTest(app);
    setTestResult(result);
    setTimeout(() => setTestResult(null), 5000);
  };
  
  return (
    <Card className={`relative overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 ${isPending ? 'opacity-75' : ''}`}>
      {/* Status indicator line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${isConnected ? 'bg-emerald-500' : 'bg-slate-200'}`} />
      
      <CardHeader className="pb-4 pt-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <LogoComponent className="w-14 h-14 rounded-lg shadow-sm" />
              {isConnected && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900">{app_name}</CardTitle>
              <CardDescription className="text-slate-500 text-sm mt-1 leading-relaxed">
                {description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Status Badge */}
        <div className="mb-4">
          <Badge 
            variant="outline" 
            className={`${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} font-medium px-3 py-1`}
          >
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot} mr-2`} />
            {statusConfig.label}
          </Badge>
        </div>
        
        {/* Connection Details */}
        {isConnected && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg space-y-1.5 text-sm">
            {connected_at && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Connected</span>
                <span className="text-slate-900 font-medium">{formatDataTimestamp(connected_at)}</span>
              </div>
            )}
            {last_sync && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Last sync</span>
                <span className="text-slate-900 font-medium">{formatDataTimestamp(last_sync)}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Test Result */}
        {testResult && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
            testResult.status === 'connected' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {testResult.status === 'connected' ? '✓' : '✗'} {testResult.message}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!isConnected ? (
            <Button
              onClick={() => onConnect(app)}
              disabled={isPending}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              {pending === 'connecting' ? (
                <LoaderIcon className="w-4 h-4 mr-2" />
              ) : (
                <PlugIcon className="w-4 h-4 mr-2" />
              )}
              Connect {app_name}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => onSync(app)}
                disabled={isPending}
                variant="outline"
                className="flex-1 text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                {pending === 'syncing' ? (
                  <LoaderIcon className="w-4 h-4 mr-2" />
                ) : (
                  <RefreshIcon className="w-4 h-4 mr-2" />
                )}
                Sync Data
              </Button>
              
              <Button
                onClick={handleTest}
                disabled={isPending}
                variant="outline"
                className="text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                {pending === 'testing' ? (
                  <LoaderIcon className="w-4 h-4 mr-2" />
                ) : (
                  <PlayIcon className="w-4 h-4 mr-2" />
                )}
                Test
              </Button>
              
              <Button
                onClick={() => onDisconnect(app)}
                disabled={isPending}
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <UnplugIcon className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Explore Integration Card
// ============================================================================

const ExploreCard = ({ integration, onConnect }) => {
  const LogoComponent = APP_LOGOS[integration.id] || ((props) => <GenericAppLogo {...props} name={integration.name} />);
  
  return (
    <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <LogoComponent className="w-12 h-12 rounded-lg shadow-sm flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">{integration.name}</h3>
              {integration.comingSoon && (
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-600 text-xs">
                  Coming Soon
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 truncate">{integration.description}</p>
          </div>
          <Button
            onClick={() => onConnect(integration.id)}
            disabled={integration.comingSoon}
            variant="outline"
            size="sm"
            className={integration.comingSoon 
              ? "opacity-50 cursor-not-allowed" 
              : "text-slate-700 border-slate-300 hover:bg-slate-50"
            }
          >
            {integration.comingSoon ? 'Soon' : 'Connect'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main Integrations Page
// ============================================================================

const IntegrationsPage = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const {
    connections,
    loading,
    error,
    pipedreamConfigured,
    lastFetched,
    connect,
    disconnect,
    sync,
    testConnection,
    refresh,
  } = useIntegrations();
  
  const [showExplore, setShowExplore] = useState(false);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <LoaderIcon className="w-8 h-8 text-slate-600" />
      </div>
    );
  }

  // Admin check
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Loading state
  if (loading && connections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <LoaderIcon className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading integrations...</p>
        </div>
      </div>
    );
  }

  const connectedCount = connections.filter(c => c.status === 'connected' || c.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/cashflow"
              className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Integrations
              </h1>
              <p className="text-slate-500 mt-1">
                Connect your business tools and automate data sync
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {connectedCount} of {connections.length} connected
            </span>
            <Button
              onClick={refresh}
              variant="outline"
              size="sm"
              className="text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Pipedream Status Banner */}
        {!pipedreamConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800">Pipedream Connect Not Configured</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Set PIPEDREAM_PROJECT_ID and PIPEDREAM_CLIENT_SECRET in your environment to enable OAuth connections.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">Error Loading Integrations</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Connected Integrations Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <PlugIcon className="w-5 h-5 text-slate-700" />
              </div>
              Your Integrations
            </h2>
            <span className="text-sm text-slate-500">
              Last updated: {formatDataTimestamp(lastFetched)}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {connections.map((conn) => (
              <IntegrationCard
                key={conn.app}
                connection={conn}
                onConnect={connect}
                onDisconnect={disconnect}
                onSync={sync}
                onTest={testConnection}
              />
            ))}
          </div>
        </div>

        <Separator className="my-10 bg-slate-200" />

        {/* Explore Integrations Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <SparklesIcon className="w-5 h-5 text-indigo-600" />
              </div>
              Explore More Integrations
            </h2>
            <Button
              onClick={() => setShowExplore(!showExplore)}
              variant="ghost"
              size="sm"
              className="text-slate-600"
            >
              {showExplore ? 'Show Less' : 'Show All'}
            </Button>
          </div>
          
          <p className="text-slate-500 mb-5">
            Connect to 2,400+ apps through Pipedream&apos;s universal integration platform
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPLORE_INTEGRATIONS.slice(0, showExplore ? undefined : 3).map((integration) => (
              <ExploreCard
                key={integration.id}
                integration={integration}
                onConnect={connect}
              />
            ))}
          </div>
          
          {/* Browse All Link */}
          <div className="mt-6 text-center">
            <a 
              href="https://pipedream.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <GridIcon className="w-5 h-5" />
              Browse All 2,400+ Apps
              <ExternalLinkIcon className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Powered by Pipedream */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex items-center justify-center gap-6">
            <span className="text-sm text-slate-400">Powered by</span>
            <a 
              href="https://pipedream.com/connect"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <PipedreamLogo className="w-8 h-8" />
              <span className="font-semibold">Pipedream Connect</span>
            </a>
          </div>
          <p className="text-center text-sm text-slate-400 mt-3">
            OAuth tokens are stored securely and refreshed automatically
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
