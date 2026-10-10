export interface NavItem {
  label: string;
  href: string;
}

export interface CtaItem {
  label: string;
  href: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  linkedin?: string;
}

export type ServiceIconKey =
  | 'kanban'
  | 'folder'
  | 'timer'
  | 'users'
  | 'chart'
  | 'calendar'
  | 'bot'
  | 'message';

export interface ServiceItem {
  slug: string;
  title: string;
  description: string;
  icon: ServiceIconKey;
}

export interface SiteConfig {
  brand: {
    name: string;
    tagline: string;
    description: string;
  };
  nav: NavItem[];
  cta: {
    trial: CtaItem;
    login: CtaItem;
  };
  contact: {
    email: string;
    phone: string;
    address: string;
    hours: string;
    linkedin: string;
    instagram: string;
  };
  stats: {
    associateCompanies: number;
    foundedYear: number;
    teamSize: number;
  };
  team: TeamMember[];
  services: ServiceItem[];
  pricing: {
    headline: string;
    body: string;
    salesEmail: string;
  };
}

export const siteConfig: SiteConfig = {
  brand: {
    name: 'Pyramid',
    tagline: 'Modern task and team management for fast-moving organizations.',
    description:
      'Run tasks, track billable time, manage leave balances, and collaborate seamlessly across teams with an AI-powered workspace.',
  },
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
    { label: 'Help', href: '/help' },
  ],
  cta: {
    trial: {
      label: 'Start 14-day free trial',
      href: '/register-company',
    },
    login: {
      label: 'Login',
      href: '/login',
    },
  },
  contact: {
    email: 'TODO_contact@pyramid.com',
    phone: 'TODO_+1 (555) 000-0000',
    address: 'TODO_123 Business Avenue, Suite 400, Tech City',
    hours: 'TODO_Mon - Fri: 9:00 AM - 6:00 PM EST',
    linkedin: 'TODO_https://linkedin.com/company/pyramid',
    instagram: 'TODO_https://instagram.com/pyramid',
  },
  // Replace these values with real business statistics
  stats: {
    associateCompanies: 0,
    foundedYear: 2024,
    teamSize: 0,
  },
  team: [
    {
      name: 'Alex Rivera',
      role: 'Co-Founder & CEO',
      bio: 'Product strategist passionate about streamlined collaboration and developer ergonomics.',
      linkedin: 'TODO_https://linkedin.com/in/alex-rivera',
    },
    {
      name: 'Sarah Chen',
      role: 'Head of Engineering',
      bio: 'Systems architect building high-performance workflow engines and AI integrations.',
      linkedin: 'TODO_https://linkedin.com/in/sarah-chen',
    },
    {
      name: 'Marcus Vance',
      role: 'Product Designer',
      bio: 'Crafting intuitive interfaces that make complex project coordination feel effortless.',
      linkedin: 'TODO_https://linkedin.com/in/marcus-vance',
    },
  ],
  services: [
    {
      slug: 'task-boards',
      title: 'Task boards and list views',
      description:
        'Organize and track tasks through interactive Kanban boards and list views with fluid drag-and-drop prioritization.',
      icon: 'kanban',
    },
    {
      slug: 'projects',
      title: 'Projects',
      description:
        'Group deliverables into customizable projects with custom color accents, status indicators, priorities, and assigned teams.',
      icon: 'folder',
    },
    {
      slug: 'time-tracking',
      title: 'Time tracking and timeline',
      description:
        'Record work hours with a real-time running timer and inspect comprehensive work timelines for accurate accountability.',
      icon: 'timer',
    },
    {
      slug: 'teams-employees',
      title: 'Teams and employees',
      description:
        'Structure departments, assign dedicated team leads, manage employee profiles, and maintain clear operational ownership.',
      icon: 'users',
    },
    {
      slug: 'activity-dashboard',
      title: 'Activity dashboard',
      description:
        'Visualize organization performance through real-time KPIs, productivity trend charts, and an interactive yearly contribution heatmap.',
      icon: 'chart',
    },
    {
      slug: 'leave-management',
      title: 'Leave management',
      description:
        'Handle time-off requests with team calendar visibility, automatic quota tracking, and one-click email approval workflows.',
      icon: 'calendar',
    },
    {
      slug: 'ai-copilot',
      title: 'AI Task Copilot',
      description:
        'Accelerate workflows with AI-assisted task breakdown, automated descriptions, smart summaries, and proactive recommendations.',
      icon: 'bot',
    },
    {
      slug: 'collaboration',
      title: 'Comments, mentions and notifications',
      description:
        'Keep discussions directly inside tasks with rich-text comments, @mentions, file attachments, and instant alerts.',
      icon: 'message',
    },
  ],
  pricing: {
    headline: 'Pricing tailored to your team',
    body: 'We are currently finalizing our subscription tiers to best serve teams of all sizes. Contact our sales team today to discuss your organization needs and find the right fit.',
    salesEmail: 'TODO_sales@pyramid.com',
  },
};
