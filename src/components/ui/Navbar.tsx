import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { LogoMark } from '../PublicShared';

export interface NavItem {
  href: string;
  label: string;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: NavItem[];
  className?: string;
  logoClassName?: string;
}

export function Navbar({ items, className, logoClassName, ...props }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav 
      className={cn('sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50', className)}
      {...props}
    >
      <div className="container flex items-center justify-between py-4 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <LogoMark className={cn('h-8 w-auto', logoClassName)} />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {items.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className="body-sm font-medium text-neutral-600 hover:text-brand-primary dark:text-neutral-400 dark:hover:text-brand-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-neutral-200/50 dark:border-neutral-800/50">
          <div className="container py-4 px-4 space-y-4">
            {items.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="block body-base font-medium text-neutral-600 hover:text-brand-primary dark:text-neutral-400 dark:hover:text-brand-primary transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}