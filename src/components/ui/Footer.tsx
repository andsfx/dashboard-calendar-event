import React from 'react';
import { cn } from '../../utils/cn';
import { LogoMark } from '../PublicShared';

export interface FooterLink {
  title: string;
  links: Array<{
    label: string;
    href: string;
  }>;
}

export interface FooterProps extends React.HTMLAttributes<HTMLDivElement> {
  links?: FooterLink[];
  className?: string;
  logoClassName?: string;
}

export function Footer({ links, className, logoClassName, ...props }: FooterProps) {
  return (
    <footer 
      className={cn('bg-white dark:bg-neutral-900 border-t border-neutral-200/50 dark:border-neutral-800/50', className)}
      {...props}
    >
      <div className="container py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <LogoMark className={cn('h-8 w-auto', logoClassName)} />
            <p className="body-sm text-neutral-600 dark:text-neutral-400 max-w-xs">
              Platform manajemen event terpadu untuk Metropolitan Mall Bekasi.
            </p>
          </div>

          {/* Links */}
          {links?.map((section, index) => (
            <div key={index} className="space-y-4">
              <h3 className="h5 font-display text-neutral-800 dark:text-white">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="body-sm text-neutral-600 hover:text-brand-primary dark:text-neutral-400 dark:hover:text-brand-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-200/50 dark:border-neutral-800/50 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="body-sm text-neutral-500 dark:text-neutral-400">
            © {new Date().getFullYear()} Metropolitan Mall Bekasi. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="body-sm text-neutral-500 hover:text-brand-primary dark:text-neutral-400 dark:hover:text-brand-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="body-sm text-neutral-500 hover:text-brand-primary dark:text-neutral-400 dark:hover:text-brand-primary transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}