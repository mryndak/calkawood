// MobileMenu — React island (client:idle)
// Hamburger toggle, full-screen overlay, nawigacja + telefon CTA
// Validates: Requirements 1.2, 1.4, 13.5

import { useState, useEffect, useRef, useCallback } from 'react';

interface NavLink {
  label: string;
  href: string;
  children?: Array<{ label: string; href: string }>;
}

interface MobileMenuProps {
  links: NavLink[];
  phone: string;
}

export default function MobileMenu({ links, phone }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const phoneHref = `tel:${phone.replace(/\s/g, '')}`;

  // Otwieranie/zamykanie menu
  const openMenu = useCallback(() => {
    setIsOpen(true);
    // Sync aria-expanded na zewnętrznym hamburgerze
    const toggle = document.getElementById('mobile-menu-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
    }
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setExpandedSubmenu(null);
    // Sync aria-expanded na zewnętrznym hamburgerze
    const toggle = document.getElementById('mobile-menu-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      // Przywróć focus na hamburger
      toggle.focus();
    }
  }, []);

  // Nasłuchuj kliknięcia na zewnętrzny hamburger button
  useEffect(() => {
    const toggle = document.getElementById('mobile-menu-toggle');
    if (!toggle) return;

    const handleToggleClick = () => {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    toggle.addEventListener('click', handleToggleClick);
    return () => toggle.removeEventListener('click', handleToggleClick);
  }, [isOpen, openMenu, closeMenu]);

  // Focus trap + Escape key
  useEffect(() => {
    if (!isOpen) return;

    // Focus na przycisk zamknięcia po otwarciu
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    // Blokuj scroll body
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && menuRef.current) {
        const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  const toggleSubmenu = (label: string) => {
    setExpandedSubmenu((prev) => (prev === label ? null : label));
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu nawigacji"
      className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur-sm"
    >
      {/* Header z przyciskiem zamknięcia */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-primary/10">
        <span className="text-xl font-bold text-primary-dark">CalkaWood</span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closeMenu}
          className="inline-flex items-center justify-center rounded-md p-2 text-text hover:bg-primary/10 hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Zamknij menu nawigacji"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Lista linków nawigacyjnych */}
      <nav aria-label="Menu mobilne" className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-1" role="menu">
          {links.map((link) => (
            <li key={link.label} role="none">
              {link.children ? (
                <div>
                  <button
                    type="button"
                    role="menuitem"
                    aria-expanded={expandedSubmenu === link.label}
                    aria-controls={`submenu-${link.label}`}
                    onClick={() => toggleSubmenu(link.label)}
                    className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-lg font-medium text-text hover:bg-primary/10 hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {link.label}
                    <svg
                      className={`h-5 w-5 transition-transform duration-200 ${expandedSubmenu === link.label ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSubmenu === link.label && (
                    <ul id={`submenu-${link.label}`} className="ml-4 mt-1 space-y-1" role="menu">
                      {link.children.map((child) => (
                        <li key={child.href} role="none">
                          <a
                            href={child.href}
                            role="menuitem"
                            onClick={closeMenu}
                            className="block rounded-lg px-4 py-2.5 text-base text-text hover:bg-primary/10 hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <a
                  href={link.href}
                  role="menuitem"
                  onClick={closeMenu}
                  className="block rounded-lg px-4 py-3 text-lg font-medium text-text hover:bg-primary/10 hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {link.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Telefon CTA na dole */}
      <div className="border-t border-primary/10 px-4 py-6">
        <a
          href={phoneHref}
          onClick={closeMenu}
          className="flex items-center justify-center gap-3 rounded-lg bg-cta px-6 py-4 text-lg font-semibold text-white hover:bg-cta-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2"
          aria-label={`Zadzwoń: ${phone}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {phone}
        </a>
      </div>
    </div>
  );
}
