// components/Header.jsx
import React, { useEffect, useState } from 'react';
import { ChevronRight, Menu, Sun, Moon } from 'lucide-react';
import logo1 from "../assets/DOR white.png";
import logo2 from "../assets/DOR black.png";
import "../styles/HomePage.css";
// Props:
// - theme: "dark" | "light"
// - onToggleTheme: () => void
// - onOpenEarnModal: () => void
export default function Header({ theme = 'dark', onToggleTheme, onOpenEarnModal }) {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen((v) => !v);

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <a href="#" className="header-logo animate-pulse-custom">
          <div className="logo-3d-container">
            <img
              src={theme === 'light' ? logo2 : logo1}
              alt="Dress On Rent"
              className="logo-image"
            />
          </div>
        </a>

        <div className="header-nav-wrapper">
          <nav className="desktop-nav">
            <a href="#men" className="nav-link group">
              Men
              <span className="nav-link-underline"></span>
            </a>
            <a href="#women" className="nav-link group">
              Women
              <span className="nav-link-underline"></span>
            </a>
            <a href="#stores-location" className="nav-link group">
              Stores Location
              <span className="nav-link-underline"></span>
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onOpenEarnModal && onOpenEarnModal();
              }}
              className="nav-link group"
            >
              Earn With Us
              <span className="nav-link-underline"></span>
            </a>
            <a href="#contact" className="nav-link group">
              Contact Us
              <span className="nav-link-underline"></span>
            </a>
            <a href="#franchise" className="nav-link group">
              Franchise
              <span className="nav-link-underline"></span>
            </a>
            <a href="/blog" className="nav-link group">
              Blog
              <span className="nav-link-underline"></span>
            </a>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className={`theme-toggle-button ${theme === 'light' ? 'light-mode' : 'dark-mode'}`}
              aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <a href="#men" className="cta-button">
              Rent Now
              <ChevronRight size={18} className="icon-right" />
            </a>
          </nav>

          <button
            className={`mobile-menu-button animate-slow-spin ${isMobileMenuOpen ? 'rotate-90' : ''}`}
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
          >
            <Menu size={28} />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <nav className="mobile-nav">
          <ul className="mobile-nav-list">
            <li><a href="#men" className="mobile-nav-item" onClick={toggleMobileMenu}>Men&apos;s Collection</a></li>
            <li><a href="#women" className="mobile-nav-item" onClick={toggleMobileMenu}>Women&apos;s Collection</a></li>
            <li><a href="#stores-location" className="mobile-nav-item" onClick={toggleMobileMenu}>Our Stores Location</a></li>
            <li><a href="#contact" className="mobile-nav-item" onClick={toggleMobileMenu}>Contact Us</a></li>
            <li><a href="#franchise" className="mobile-nav-item" onClick={toggleMobileMenu}>Franchise Opportunities</a></li>
            <li><a href="/blog" className="mobile-nav-item" onClick={toggleMobileMenu}>Blog</a></li>

            <li>
              <button
                onClick={() => {
                  onOpenEarnModal && onOpenEarnModal();
                  toggleMobileMenu();
                }}
                className="mobile-nav-item"
                style={{ color: 'var(--color-accent)', fontWeight: 'bold', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
              >
                Earn with Us
              </button>
            </li>

            <li>
              <button
                onClick={() => {
                  onToggleTheme && onToggleTheme();
                  toggleMobileMenu();
                }}
                className="mobile-nav-item theme-toggle-mobile"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {theme === 'dark' ? <Sun size={18} className="mr-2" /> : <Moon size={18} className="mr-2" />}
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </button>
            </li>

            <li>
              <a href="#men" className="mobile-nav-item" onClick={toggleMobileMenu} style={{ fontWeight: 'bold' }}>
                Rent Now
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
