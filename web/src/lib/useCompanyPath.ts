"use client";

import React from 'react';
import Link, { LinkProps } from 'next/link';
import { useCompany } from '../contexts/CompanyContext';
import { getCompanySlug } from './api';

/**
 * Hook that returns a path resolver for the currently active company.
 * e.g. useCompanyPath()('/tasks') => '/acme-corp/tasks'
 */
export function useCompanyPath(): (path: string) => string {
  const company = useCompany();
  const activeSlug = company?.slug || getCompanySlug() || '';

  return (path: string): string => {
    if (!path) return `/${activeSlug}`;

    // Leave external links, hashes, and mailto untouched
    if (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('mailto:') ||
      path.startsWith('#')
    ) {
      return path;
    }

    // If company slug is not available yet, return raw normalized path
    if (!activeSlug) {
      return path.startsWith('/') ? path : `/${path}`;
    }

    // Avoid double-prefixing if already prefixed with active slug
    if (path === `/${activeSlug}` || path.startsWith(`/${activeSlug}/`)) {
      return path;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/${activeSlug}${cleanPath}`;
  };
}

export interface CompanyLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    LinkProps {
  children?: React.ReactNode;
}

/**
 * Company-aware Link component wrapping next/link.
 * Automatically prefixes string hrefs with `/${slug}` for internal paths.
 */
export const CompanyLink = React.forwardRef<HTMLAnchorElement, CompanyLinkProps>(
  ({ href, ...props }, ref) => {
    const resolveCompanyPath = useCompanyPath();

    const resolvedHref = React.useMemo(() => {
      if (typeof href === 'string') {
        return resolveCompanyPath(href);
      }
      return href;
    }, [href, resolveCompanyPath]);

    return React.createElement(Link, { ref, href: resolvedHref, ...props });
  },
);

CompanyLink.displayName = 'CompanyLink';
