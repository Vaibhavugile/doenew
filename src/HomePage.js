// HomePage.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './HomePage.css';
import useScrollReveal from './hooks/useScrollReveal';

// Import icons from lucide-react
import { ChevronRight, Sparkles, Shirt, Crown, User, Mail, Phone, MapPin, Instagram, Facebook, Twitter, Clock, Wand2, Loader2, Star, Menu } from 'lucide-react'; // Added Loader2 for loading state

// Import Firebase
import { db } from './firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import aboutus1 from "../src/assets/Gemini_Generated_Image_jprw1njprw1njprw.png";
import aboutus2 from "../src/assets/Gemini_Generated_Image_mjcef7mjcef7mjce.png";
// Import Helmet for SEO meta tags
import { Helmet } from 'react-helmet-async';
function HomePage() {
  const [menCategories, setMenCategories] = useState([]);
  const [womenCategories, setWomenCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productFetchError, setProductFetchError] = useState('');

  // Store Locations Data - Now fetched dynamically
  const [storeLocations, setStoreLocations] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState('');

  // NEW STATE: State for modal visibility
  const [showStoreModal, setShowStoreModal] = useState(true);
  // NEW STATE for scroll effect
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation(); // Get the current location object


  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        // Scroll smoothly to the element
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // After scrolling, remove the hash from the URL
          // Use replaceState to change the URL without adding a new entry to the browser history
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 100); // Small delay to allow scroll to initiate
      }
    }
  }, [location]); // Re-run effect when the location object (specifically the hash) changes
  // Re-run effect when the location object (specifically the hash) changes
  useEffect(() => {
    // Use setTimeout with a small delay to override browser's scroll restoration
    setTimeout(() => {
      window.scrollTo(0, 0); // Scroll to the very top (x=0, y=0)
    }, 0); // A 0ms delay moves it to the end of the current JavaScript execution queue
  }, []);
  // Effect for scroll to add/remove 'scrolled' class
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) { // Adjust this value as needed
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  // Data for Testimonials (can also be fetched from Firebase)
  const testimonials = [
    {
      quote: "Renting from them was a breeze! The suit was perfect for my event, and the quality was exceptional. Highly recommend for any occasion!",
      author: "Rahul Sharma",
      city: "Camp, Pune",
      rating: 5,
      keywords: ["Easy Rental", "Perfect Fit", "Exceptional Quality", "Highly Recommended"]
    },
    {
      quote: "My pre-wedding gown was stunning and fit perfectly. Saved me so much money, and the process was seamless. Will definitely use again!",
      author: "Priya Singh",
      city: "Wakad, Pune",
      rating: 5,
      keywords: ["Stunning Gown", "Perfect Fit", "Cost-Effective", "Seamless Process", "Will Use Again"]
    },
    {
      quote: "Excellent collection and very professional service. Found the ideal sherwani for my brother's wedding. Their team was very helpful.",
      author: "Amit Kumar",
      city: "Nagpur",
      rating: 4,
      keywords: ["Excellent Collection", "Professional Service", "Helpful Team", "Ideal Sherwani"]
    },
    {
      quote: "The dress I rented for my friend's reception was beautiful and in perfect condition. Great value for money!",
      author: "Sneha Reddy",
      city: "Koregaon Park, Pune",
      rating: 5,
      keywords: ["Beautiful Dress", "Perfect Condition", "Great Value"]
    },
    {
      quote: "Very easy process from selection to return. The outfit was exactly as described and suited my event perfectly.",
      author: "John Doe",
      city: "Baner, Pune",
      rating: 4,
      keywords: ["Easy Process", "Accurate Description", "Suited Event Perfectly"]
    }
  ];
  // State for the image slider
  const [currentSlide, setCurrentSlide] = useState(0);
  // State for mobile menu open/close

  // State for Style Advisor feature
  const [eventDescription, setEventDescription] = useState('');
  const [styleAdvice, setStyleAdvice] = useState('');
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState('');

  // --- Firebase Data Fetching for Categories ---
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      setCategoryError('');
      try {
        const menQuery = query(collection(db, 'menCategories'), orderBy('order'));
        const menSnapshot = await getDocs(menQuery);
        const menData = menSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMenCategories(menData);

        const womenQuery = query(collection(db, 'womenCategories'), orderBy('order'));
        const womenSnapshot = await getDocs(womenQuery);
        const womenData = womenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWomenCategories(womenData);

      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategoryError("Failed to load categories. Please try again later.");
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // --- Firebase Data Fetching for Stores ---
  useEffect(() => {
    const fetchStores = async () => {
      setLoadingStores(true);
      setStoreError('');
      try {
        const storesCollectionRef = collection(db, 'filterOptions', 'stores', 'list');
        const storeSnapshot = await getDocs(storesCollectionRef);
        // Assuming each store document has a 'name' field and potentially an 'image' field
        const fetchedStores = storeSnapshot.docs.map(doc => ({ id: doc.id, name: doc.id, image: doc.data().imageUrl || `https://placehold.co/1200x600/404040/e0e0e0?text=${doc.id.replace(/\s/g, '+')}` }));
        setStoreLocations(fetchedStores);
      } catch (error) {
        console.error("Error fetching store locations:", error);
        setStoreError("Failed to load store locations. Please try again.");
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, []); // Run once on component mount

  // Auto-slide functionality for store images
  useEffect(() => {
    if (storeLocations.length > 0) { // Only start slider if stores are loaded
      const slideInterval = setInterval(() => {
        setCurrentSlide((prevSlide) => (prevSlide + 1) % storeLocations.length);
      }, 5000);

      return () => clearInterval(slideInterval);
    }
  }, [storeLocations.length]);

  // Function to handle dot clicks for slider
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Function to toggle mobile menu visibility
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Function to get style advice from Gemini API
  const getStyleAdvice = async () => {
    if (!eventDescription.trim()) {
      setAdviceError('Please describe your event to get style advice.');
      return;
    }

    setIsLoadingAdvice(true);
    setAdviceError('');
    setStyleAdvice('');

    try {
      let chatHistory = [];
      const prompt = `Given the event: "${eventDescription}", suggest 3-5 suitable dress or suit styles from a rental perspective for a dress rental business. Focus on popular categories like Suits, Blazers, Sherwani, Jodhpuri for men, and Bridal Gowns, Sangeet Gowns, Pre-Wedding Gowns, Maternity Gowns, Bridal Maternity Gowns for women. Provide short, concise suggestions.`;
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = { contents: chatHistory };
      const apiKey = "AIzaSyB8Qs1DCfin_qFAoo19CDAe8I3qnkmaj0U";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setStyleAdvice(text);
      } else {
        setAdviceError('Could not get style advice. Please try again.');
        console.error('Gemini API response structure unexpected:', result);
      }
    } catch (error) {
      setAdviceError('Failed to fetch style advice. Please check your network connection.');
      console.error('Error fetching style advice:', error);
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  // --- Scroll Reveal Hooks for each section ---
  const [storesRef, storesIsVisible] = useScrollReveal({ threshold: 0.2 });
  const [sliderRef, sliderIsVisible] = useScrollReveal({ threshold: 0.2 });
  const [menRef, menIsVisible] = useScrollReveal({ threshold: 0.2 });
  const [womenRef, womenIsVisible] = useScrollReveal({ threshold: 0.2 });
  const [howItWorksRef, howItWorksIsVisible] = useScrollReveal({ threshold: 0.3 });
  const [styleAdvisorRef, styleAdvisorIsVisible] = useScrollReveal({ threshold: 0.2 });
  const [aboutUsRef, aboutUsIsVisible] = useScrollReveal({ threshold: 0.2 });
  const [testimonialsRef, testimonialsIsVisible] = useScrollReveal({ threshold: 0.2 });

  return (
    <div className="home-page">
      {/* Store Selection Modal */}
      {/* SEO Optimization with React Helmet */}
      <Helmet>
        {/* Optimized Title Tag */}
        <title>Dress On Rent (DOR): Luxury Lehengas, Sherwanis & Gowns for Rent in Pune & Nagpur</title>

        {/* Optimized Meta Description */}
        <meta name="description" content="DOR offers exquisite designer lehengas, bridal gowns, sherwanis, and suits for rent in Pune & Nagpur. Discover sustainable luxury for weddings, parties, and special occasions. Book your rental outfit today! Find affordable, eco-friendly dress rental services with hassle-free options." />

        {/* Optimized Meta Keywords (less impactful now, but good to include) */}
        <meta name="keywords" content="dress on rent Pune, dress on rent Nagpur, outfit rental Pune, clothes rental Nagpur, fashion rental Pune, designer dress rental Nagpur, luxury dress on rent Pune, rental formal wear Pune, rental ethnic wear Nagpur, sherwani on rent Pune, suit on rent Nagpur, tuxedo on rent Pune, jodhpuri suit on rent Nagpur, men's wedding wear rental Pune, blazer on rent Nagpur, men's party wear rental Pune, lehenga on rent Pune, bridal lehenga on rent Nagpur, gown on rent Pune, pre-wedding gown on rent Nagpur, sangeet gown on rent Pune, reception gown on rent Nagpur, maternity gown on rent Pune, bridal maternity gown on rent Nagpur, women's ethnic wear rental Pune, women's party wear rental Nagpur, designer gown rental Pune, wedding dress on rent Pune, engagement dress on rent Nagpur, reception outfit on rent Pune, party wear on rent Nagpur, festival outfit on rent Pune, photoshoot dress on rent Nagpur, dress on rent Wakad, lehenga on rent Koregaon Park, suit on rent Baner, dress on rent Camp Pune, affordable dress rental Pune, eco-friendly fashion rental Nagpur, sustainable dress rental Pune, budget-friendly rental outfits, hassle-free dress rental, DOR dress on rent, DOR Pune, DOR Nagpur, dress on rent Pimpri Chinchwad, lehenga on rent Kothrud, suit on rent Hadapsar, gown on rent Viman Nagar, sherwani rental Karve Nagar, dress on rent Deolali Nagpur, tuxedo rental Wardha Road Nagpur, party wear rental Baner, ethnic wear rental Aundh, dress on rent near me Pune, lehenga rental near me Nagpur, pre-wedding shoot dress on rent Pune, engagement gown on rent Nagpur, cocktail party dress on rent Pune, sangeet outfit on hire Nagpur, haldi ceremony dress on rent Pune, reception gown rental Pune, anniversary party dress on rent Nagpur, corporate event suit rental Pune, graduation gown on rent Pune, fancy dress on rent Pune, prom dress on rent Nagpur, embroidered lehenga on rent Pune, velvet sherwani on rent Nagpur, silk gown on rent Pune, sequin dress on rent Nagpur, designer replica lehenga on rent Pune, indo-western outfit on rent Nagpur, traditional Marathi dress on rent Pune, save money on wedding dress Pune, avoid buying expensive lehenga Nagpur, rent vs buy ethnic wear Nagpur, budget friendly wedding outfit Pune, convenient dress rental service Nagpur, hassle-free formal wear rental Pune, where to rent designer lehengas in Pune, how to find affordable suits on rent Nagpur, best place to rent wedding gowns Pune, cost of lehenga on rent in Pune, dress rental for photoshoot near Nagpur, mens formal wear rental options Pune, latest collection of gowns on rent Nagpur, ethnic wear hire Pune, formal wear hire Nagpur, outfit hire Pune, attire rental Nagpur, garment rental Pune, clothing rental Nagpur, boutique rental Pune" />

        {/* LocalBusiness Schema Markup for Pune and Nagpur locations (JSON-LD) */}
        {/* IMPORTANT: Replace all placeholder URLs, addresses, and contact info with your actual details */}
        <script type="application/ld+json">
          {`
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "DOR - Dress On Rent",
            "url": "https://www.yourdorwebsite.com/", // *** REPLACE with your actual website URL ***
            "image": "https://www.yourdorwebsite.com/logo.png", // *** REPLACE with your logo URL (e.g., a high-res logo) ***
            "description": "DOR offers premium lehengas, sherwanis, suits, gowns, and bridal wear on rent in Pune & Nagpur for weddings, parties, and special events. Find affordable, eco-friendly, and hassle-free dress rental services including designer outfits, maternity gowns, and specific occasion wear.",
            "address": [
              {
                "@type": "PostalAddress",
                "streetAddress": "Your Pune Street Address Here", // *** REPLACE with actual Pune address ***
                "addressLocality": "Pune",
                "addressRegion": "MH",
                "postalCode": "411001", // *** REPLACE with actual Pune postal code ***
                "addressCountry": "IN"
              },
              {
                "@type": "PostalAddress",
                "streetAddress": "Your Nagpur Street Address Here", // *** REPLACE with actual Nagpur address ***
                "addressLocality": "Nagpur",
                "addressRegion": "MH",
                "postalCode": "440001", // *** REPLACE with actual Nagpur postal code ***
                "addressCountry": "IN"
              }
            ],
            "telephone": "+919876543210", // *** REPLACE with your actual contact number (e.g., +919876543210) ***
            "priceRange": "$$", // Indicative price range (e.g., $, $$, $$$)
            "openingHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
                ],
                "opens": "10:00", // Your opening time
                "closes": "21:00" // Your closing time
              }
            ],
            "sameAs": [
              "https://www.instagram.com/yourdorinstagram", // *** REPLACE with your Instagram URL ***
              "https://www.facebook.com/yourdorfacebook", // *** REPLACE with your Facebook URL ***
              "https://www.twitter.com/yourdortwitter" // *** REPLACE with your Twitter URL if applicable ***
            ]
          }
        `}
        </script>
      </Helmet>
      {showStoreModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Welcome to Dress On Rent!</h2>
            <p className="modal-description">Please select your preferred store location to start Browse our collections.</p>
            {loadingStores ? (
              <div className="modal-loading">
                <Loader2 size={32} className="animate-spin text-blue-500" />
                <p>Loading stores...</p>
              </div>
            ) : storeError ? (
              <p className="modal-error">{storeError}</p>
            ) : (
              <div className="modal-store-options">
                {storeLocations.map((store) => (
                  <button
                    key={store.id}
                    className="btn btn-primary modal-store-button"
                    onClick={() => {
                      localStorage.setItem('selectedStore', store.name);
                      setShowStoreModal(false);
                    }}
                  >
                    <div className="modal-button-icon-bg">
                      <Crown size={64} className="modal-button-icon" />
                    </div>
                    <span className="modal-button-text">{store.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}

      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-container">
          {/* The <h1> tag signifies this as the most important heading on the page for SEO. */}
          {/* Using <Link to="/"> ensures client-side routing and clean URL for homepage. */}
          <a href="#" className="header-logo animate-pulse-custom">
            Dress On<span> Rent</span> {/* Added span for accent color */}
          </a>
          <div className="header-nav-wrapper">
            <nav className="desktop-nav">
              {/* Navigation links are already descriptive, which is good for SEO. */}
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
              <a href="#how-it-works" className="nav-link group">
                How It Works
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
              {/* New Call to Action Button - Anchor text is clear */}
              <a href="#men" className="cta-button">
                Rent Now
                <ChevronRight size={18} className="icon-right" />
              </a>
            </nav>
            <button
              className={`mobile-menu-button animate-slow-spin ${isMobileMenuOpen ? 'rotate-90' : ''}`}
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              // SEO Change 2: Added aria-label for accessibility for screen readers
              aria-label={isMobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
            >
              {/* Replaced SVG with Lucide icon */}
              <Menu size={28} />
            </button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <nav className="mobile-nav">
            <ul className="mobile-nav-list">
              <li><a href="#men" className="mobile-nav-item" onClick={toggleMobileMenu}>Men's Collection</a></li>
              <li><a href="#women" className="mobile-nav-item" onClick={toggleMobileMenu}>Women's Collection</a></li>
              <li><a href="#stores-location" className="mobile-nav-item" onClick={toggleMobileMenu}>Our Stores Location</a></li>
              <li><a href="#contact" className="mobile-nav-item" onClick={toggleMobileMenu}>Contact Us</a></li>
              <li><a href="#franchise" className="mobile-nav-item" onClick={toggleMobileMenu}>Franchise Opportunities</a></li>
              {/* Mobile CTA Button if desired, or just direct them to sections */}
              <li>
                <a href="#men" className="mobile-nav-item" onClick={toggleMobileMenu} style={{ color: '#db2777', fontWeight: 'bold' }}>
                  Rent Now
                </a>
              </li>
            </ul>
          </nav>
        )}
      </header>
      {/* Hero Section */}
      {/* Hero Section - Alternative Design */}
      {/* Hero Section - Split Layout Design */}
      {/* Hero Section - Ultimate Design with Background Image */}
      <section className="hero-section-ultimate">
        <div className="hero-ultimate-background"></div> {/* This will hold the background image and overlay */}
        <div className="container hero-ultimate-content">
          {/* SEO Change 1: Added the H1 tag for your primary heading */}
          {/* This is crucial for search engines to understand the main topic of your page. */}
          {/* The styling for this H1 is handled in the CSS section below. */}

          <p className="hero-ultimate-description animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Step into elegance without compromise. Rent the finest designer wear for your unforgettable moments . Look stunning for every occasion with our premium lehengas, sherwanis, gowns, and suits. Explore hassle-free and affordable dress rental options near you.
          </p>
          <div className="hero-ultimate-buttons animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/#women" className="cta-button hero-ultimate-button-women">
              Explore Women's Rental Styles
              <ChevronRight size={18} className="icon-right" />
            </Link>
            <Link to="/#men" className="cta-button hero-ultimate-button-men">
              Explore Men's Rental Styles
              <ChevronRight size={18} className="icon-right" />
            </Link>
          </div>
        </div>
      </section>
      {/* Store Locations Section */}
      <section id="stores-location"
        ref={storesRef}
        className={`section bg-white ${storesIsVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}>
        <div className="container text-center">
          {/* H2 tag is already well-placed for section title */}
          <h2 className="section-title">DOR Dress On Rent Stores in Pune & Nagpur</h2>
          {loadingStores ? (
            <div className="message-container loading">
              <Loader2 size={48} className="animate-spin text-blue-500" />
              <p className="message-text">Loading our dress rental stores...</p>
            </div>
          ) : storeError ? (
            <p className="message-container error">{storeError}</p>
          ) : storeLocations.length === 0 ? (
            <p className="message-container no-products">No store locations found.</p>
          ) : (
            <div className="grid-3-col">
              {storeLocations.map((store) => (
                <div key={store.id} className="store-card">
                  <img
                    src={store.image}
                    alt={`DOR Dress On Rent store location in ${store.name} for gown and suit rentals, including options for ${store.name.includes('Pune') ? 'Pimpri Chinchwad, Kothrud' : 'Deolali, Wardha Road'}`}
                    className="store-card-image"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x300/cccccc/333333?text=DOR ${store.name} Store`; }}
                  />
                  {/* H3 tag is appropriate for individual store names */}
                  <h3 className="card-title">{store.name} Store</h3>
                  {/* If store.address is available, you might consider adding it here as well for local SEO */}
                  {/* {store.address && <p className="store-address">{store.address}</p>} */}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Store Image Slider */}
      <section className={`section bg-neutral-100 overflow-hidden ${sliderIsVisible ? 'animate-fade-in' : 'opacity-0'}`} ref={sliderRef}>
        <div className="container">
          {/* H2 tag is appropriate for this section title */}
          <h2 className="section-title">A Glimpse Inside Our DOR Dress Rental Stores</h2>
          {loadingStores ? (
            <div className="message-container loading">
              <Loader2 size={48} className="animate-spin text-blue-500" />
              <p className="message-text">Loading store images for dress rentals...</p>
            </div>
          ) : storeError ? (
            <p className="message-container error">{storeError}</p>
          ) : storeLocations.length === 0 ? (
            <p className="message-container no-products">No store images available.</p>
          ) : (
            <>
              <div className="slider-container">
                {storeLocations.map((store, index) => (
                  <img
                    key={store.id}
                    src={store.image}
                    alt={`DOR Dress On Rent ${store.name} store showroom with rental lehengas, suits, gowns, and ethnic wear in Pune and Nagpur`}
                    className={`slider-image ${index === currentSlide ? 'active-slide' : 'hidden-slide'}`}
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/1200x600/cccccc/333333?text=DOR+${store.name}+Store+Image`; }}
                  />
                ))}
                <div className="slider-dots">
                  {storeLocations.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`dot ${index === currentSlide ? 'active-dot' : ''}`}
                      aria-label={`Go to slide ${index + 1}`}
                    ></button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      {/* Men's Collection Section */}

      <section id="men" ref={menRef} className={`section bg-white ${menIsVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}>
        <div className="container">
          {/* H2 tag is appropriate for the section title */}
          <h2 className="section-title">Men's Collection</h2>
          {loadingCategories ? (

            <p className="text-center text-gray-600">Loading men's rental categories...</p>
          ) : categoryError ? (
            <p className="text-center text-red-500">{categoryError}</p>
          ) : (
            <div className="grid-4-col">
              {menCategories.map((category) => (
                <Link
                  to={`/collection/men/${category.name}`}
                  key={category.id}
                  className="category-card animate-pop-in"
                  aria-label={`Explore Men's ${category.name} collection for rent`} // Accessibility/SEO improvement
                >
                  <img
                    src={category.imageUrl || category.image}
                    alt={`DOR Men's ${category.name} collection for rent in Pune and Nagpur, including wedding wear and party wear options`}
                    className="category-card-image"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x300/cccccc/333333?text=Men's ${category.name}`; }}
                  />
                  <div className="category-card-content">
                    <h3 className="card-title">{category.name}</h3>
                    <p className="card-subtitle">Explore Styles</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Women's Collection Section */}
      <section id="women" ref={womenRef} className={`section bg-neutral-100 ${womenIsVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}>
        <div className="container">
          {/* H2 tag is appropriate for the section title */}
          <h2 className="section-title">Women's Collection </h2>

          {loadingCategories ? (
            <p className="text-center text-gray-600">Loading women's rental categories...</p>
          ) : categoryError ? (
            <p className="text-center text-red-500">{categoryError}</p>
          ) : (
            <div className="grid-4-col"> {/* Keeping grid-4-col for consistency, assuming its responsiveness is handled */}
              {womenCategories.map((category) => (
                <Link
                  to={`/collection/women/${category.name}`}
                  key={category.id}
                  className="category-card alt-card animate-pop-in"
                  aria-label={`Explore Women's ${category.name} collection for rent`} // Accessibility/SEO improvement
                >
                  <img
                    src={category.imageUrl || category.image}
                    alt={`DOR Women's ${category.name} for rent in Pune and Nagpur, ideal for bridal, pre-wedding, or party wear`}
                    className="category-card-image"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x300/cccccc/333333?text=Women's ${category.name}`; }}
                  />
                  <div className="category-card-content">
                    <h3 className="card-title">{category.name}</h3>
                    <p className="card-subtitle">Discover More</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* How It Works Section */}
      <section id="how-it-works" ref={howItWorksRef} className={`section bg-white ${howItWorksIsVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0.1s' }}>
        <div className="container text-center">
          {/* H2 tag is appropriate for the section title */}
          <h2 className="section-title">How to Rent Your Perfect Outfit from DOR - Dress On Rent</h2>
          <div className="grid-3-col">
            <div className={`how-it-works-step-card ${howItWorksIsVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0.1s' }}>
              <div className="how-it-works-icon-wrapper">
                <Sparkles size={36} className="how-it-works-icon" />
              </div>
              <h3 className="card-title">1. Choose Your Rental Outfit</h3>
              <p className="step-description">Browse our extensive collection of designer lehengas on rent, sherwanis on rent, gowns on rent, suits on rent, and other premium dresses for all occasions available for rent in Pune and Nagpur. Find your ideal wedding dress on rent, party wear on rent, or photoshoot dress on rent with ease, offering affordable and hassle-free dress rental.</p>
            </div>
            <div className={`how-it-works-step-card ${howItWorksIsVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0.2s' }}>
              <div className="how-it-works-icon-wrapper">
                <Shirt size={36} className="how-it-works-icon" />
              </div>
              <h3 className="card-title">2. Select Rental Dates & Size</h3>
              <p className="step-description">Pick your rental period and find your perfect fit with our detailed size guides. We offer personalized fittings at our Pune and Nagpur stores for your chosen rental attire, ensuring a convenient dress rental service.</p>
            </div>
            <div className={`how-it-works-step-card ${howItWorksIsVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0.3s' }}>
              <div className="how-it-works-icon-wrapper">
                <Crown size={36} className="how-it-works-icon" />
              </div>
              <h3 className="card-title">3. Rock Your Rented Look & Return</h3>
              <p className="step-description">Enjoy your event! After your special occasion, simply return the rented outfit to us. We handle the cleaning and maintenance, making your dress rental experience hassle-free. It's a sustainable and eco-friendly fashion rental choice.</p>
            </div>
          </div>
        </div>
      </section>
      {/* SEO Change 1: Add HowTo Schema Markup using Helmet */}
      {/* This should be placed within your main <Helmet> component at the top of HomePage.js */}
      {/* If you already have a Helmet component, add this script tag inside it. */}
      <Helmet>
        <script type="application/ld+json">
          {`
                {
                    "@context": "https://schema.org",
                    "@type": "HowTo",
                    "name": "How to Rent a Dress from DOR - Dress On Rent in Pune & Nagpur",
                    "description": "A simple guide to renting premium ethnic and formal wear from DOR in Pune and Nagpur, offering affordable and hassle-free solutions for various occasions.",
                    "step": [
                        {
                            "@type": "HowToStep",
                            "name": "Choose Your Rental Outfit",
                            "text": "Browse our extensive collection of designer lehengas, sherwanis, gowns, suits, and other premium dresses and suits for all occasions available for rent in Pune and Nagpur, including options for pre-wedding shoots, parties, and festivals. Find your ideal wedding dress on rent or party wear on rent."
                        },
                        {
                            "@type": "HowToStep",
                            "name": "Select Rental Dates & Size",
                            "text": "Pick your rental period and find your perfect fit with our detailed size guides. We offer fittings at our Pune and Nagpur stores for your chosen rental attire, ensuring a convenient dress rental service and helping you avoid buying expensive outfits."
                        },
                        {
                            "@type": "HowToStep",
                            "name": "Rock Your Rented Look & Return",
                            "text": "Enjoy your event! After your special occasion, simply return the rented outfit to us. We handle the cleaning and maintenance, making your dress rental experience hassle-free. This promotes sustainable and eco-friendly fashion rental."
                        }
                    ]
                }
            `}
        </script>
      </Helmet>

      {/* ✨ Style Advisor Section (Gemini API Integration) ✨ */}
      <section ref={styleAdvisorRef} className={`section bg-neutral-100 text-center ${styleAdvisorIsVisible ? 'animate-fade-in' : 'opacity-0'}`}>
        <div className="container">
          {/* H2 tag is appropriate for the section title */}
          <h2 className="section-title">✨ Get Personalized Style Advice for Your Dress Rental Outfit ✨</h2>
          <p className="section-description-sub">
            Describe your event, and our AI-powered style advisor will suggest the perfect rental attire, from lehengas on rent and sherwanis on rent to gowns on rent and suits on rent, tailored for your occasion in Pune or Nagpur! Whether it's a cocktail party, corporate event, or a photoshoot, we help you find the latest collection and best place to rent your desired outfit.
          </p>
          <div className="style-advisor-form">
            <textarea
              className="style-advisor-textarea"
              placeholder="e.g., 'A formal corporate gala dinner', 'A casual outdoor summer wedding', 'A traditional Indian festival'"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows="4"
              aria-label="Describe your event for style advice for dress rental" // SEO Change 1: Added aria-label for accessibility
            ></textarea>
            <button
              onClick={getStyleAdvice}
              disabled={isLoadingAdvice}
              className="btn btn-primary btn-lg style-advisor-button animate-button-press"
              aria-label={isLoadingAdvice ? "Getting style advice" : "Get personalized dress rental style advice"} // SEO Change 2: Dynamic aria-label for button
            >
              {isLoadingAdvice ? (
                <>
                  <svg className="spinner-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="spinner-path-1" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="spinner-path-2" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Getting Advice...
                </>
              ) : (
                <>
                  <Wand2 className="icon-mr" size={20} />
                  Get Style Advice
                </>
              )}
            </button>
            {adviceError && (
              <p className="error-message">{adviceError}</p>
            )}
            {styleAdvice && (
              <div className="style-advice-output">
                <h3 className="output-title">Our Rental Outfit Recommendation:</h3>
                <p className="output-text">{styleAdvice}</p>
              </div>
            )}
          </div>
        </div>
      </section>               
       <section
        id="testimonials"
        ref={testimonialsRef}
        className={`section bg-white ${testimonialsIsVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
        // SEO Change 1: Add Schema.org microdata for AggregateRating and LocalBusiness
        itemScope
        itemType="https://schema.org/LocalBusiness" // Changed to LocalBusiness for broader applicability and review snippets
      >
        <div className="container text-center">
          {/* SEO Change 2: Enhanced H2 title with keywords */}
          <h2 className="section-title">What Our Customers Say About DOR Dress On Rent  - Top Rental Outfits</h2>

          {/* SEO Change 5: Added meta tags for LocalBusiness schema properties for the business itself */}
          <meta itemProp="name" content="DOR Dress On Rent" />
          <meta itemProp="url" content="YOUR_WEBSITE_URL_HERE" /> {/* Replace with your actual website URL */}
          <meta itemProp="image" content="YOUR_BUSINESS_LOGO_URL_HERE" /> {/* Replace with your business logo URL */}
          <meta itemProp="telephone" content="+91-YOUR-PHONE-NUMBER" /> {/* Replace with your actual phone number */}
          <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
            <meta itemProp="addressLocality" content="Pune" />
            <meta itemProp="addressRegion" content="Maharashtra" />
            <meta itemProp="addressCountry" content="IN" />
          </div>

          <div className="grid-3-col gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="testimonial-card animate-pop-in"
                style={{ transitionDelay: `${index * 0.1}s` }}
                // SEO Change 3: Add Schema.org microdata for individual Review
                itemScope
                itemType="https://schema.org/Review"
                itemProp="review" // Nested within LocalBusiness
              >
                <p className="testimonial-quote" itemProp="reviewBody">"{testimonial.quote}"</p>
                {/* Display stars for rating */}
                <div className="testimonial-rating" itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
                  <meta itemProp="ratingValue" content={testimonial.rating} />
                  <meta itemProp="bestRating" content="5" />
                  <meta itemProp="worstRating" content="1" />
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      fill={i < testimonial.rating ? '#FFD700' : 'none'} // Gold for filled stars
                      stroke={i < testimonial.rating ? '#FFD700' : '#d1d5db'} // Stroke color
                      className="inline-block"
                    />
                  ))}
                </div>
                <p className="testimonial-author" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <span itemProp="name">{testimonial.author}</span>
                </p>
                <p className="testimonial-city">{testimonial.city}</p>
                {/* SEO Change 6: Add itemReviewed for each individual review */}
                <div itemProp="itemReviewed" itemScope itemType="https://schema.org/LocalBusiness">
                  <meta itemProp="name" content="DOR Dress On Rent" />
                </div>
              </div>
            ))}
          </div>
          {/* SEO Change 4: Add AggregateRating properties, nested under LocalBusiness */}
          <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
            <meta itemProp="ratingCount" content={testimonials.length} />
            {/* Calculate average rating dynamically for best accuracy */}
            <meta itemProp="ratingValue" content={(testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1)} />
          </div>

          {/* Add a link to your Google My Business reviews */}
          <div className="mt-8 text-center">
            <a
              href="https://g.page/your-dor-pune-gmb-link/review?rc" // Replace with your actual Google My Business review link for Pune
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary animate-button-press"
              aria-label="Read more customer reviews for DOR Dress On Rent on Google" // SEO Change 5: Added aria-label for accessibility
            >
              Read More Reviews on Google <ChevronRight size={16} className="inline-block ml-1" />
            </a>
          </div>
        </div>
      </section>
      <section
        id="about-us"
        ref={aboutUsRef}
        className={`section bg-neutral-100 ${aboutUsIsVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
        // SEO Change 1: Add Schema.org microdata for Organization to the section
        itemScope
        itemType="https://schema.org/Organization"
      >
        <div className="container max-width-3xl text-center">
          {/* SEO Change 2: Enhanced H2 title with keywords */}
          <h2 className="section-title">About DOR - Your Premier Dress Rental Destinations</h2>
          <div className="container about-us-split-container">
            <div className="about-us-split-image-wrapper">
              {/* Images placed directly inside the wrapper */}
              <img
                src={aboutus1}
                alt="Dress On Rent Image 1"
                className="about-us-split-image"
              />
              <img
                src={aboutus2}
                alt="Dress On Rent Image 2"
                className="about-us-split-image"
              />
            </div>
            <div className="about-us-split-content-wrapper">
              {/* Keeping as h2 as per original structure, but semantically h3 might be considered if the above is the primary h2 */}
              <h2 className="section-title text-left mb-6">More Than Just Fashion: This is DOR - Dress On Rent</h2>
              <p className="about-us-split-text" itemProp="description">
                Welcome to DOR, your premier destination for luxury dress rentals in Pune and Nagpur. Founded in 2020 from a shared passion for sustainable fashion and making high-end style accessible, we embarked on a mission to redefine elegance for every special occasion. We believe that renting designer clothing like lehengas, sherwanis, gowns, and suits is more than just what you wear; it’s a form of expression, a statement of values, and a companion on your life’s most memorable journeys.                    </p>
              <p className="about-us-split-text">
                Our curated collections are born from a desire to blend timeless elegance with contemporary trends, featuring ethically sourced and meticulously crafted rental garments for both men and women. Each gown on rent, lehenga on rent, and suit on rent is thoughtfully selected and maintained. We are the best place to rent wedding gowns, mens formal wear rental options, and offer latest collection of gowns on rent for various events, including pre-wedding shoots, cocktail parties, and graduation ceremonies.                    </p>
              {/* Optional: If you have a more detailed about page */}
              {/* <Link to="/about-detailed" className="btn btn-primary mt-4">Discover Our Full Story</Link> */}
              <div className="about-us-split-highlights">
                <div className="highlight-item">
                  <Sparkles size={28} className="highlight-icon text-pink-600" />
                  <div>
                    <h4 className="highlight-title">Quality First Rental Outfits</h4>
                    <p className="highlight-text">Every gown, lehenga, and suit for rent is carefully curated for impeccable craftsmanship and premium materials.</p>
                  </div>
                </div>
                <div className="highlight-item">
                  <Wand2 size={28} className="highlight-icon text-pink-600" />
                  <div>
                    <h4 className="highlight-title">Sustainable Style through Dress Rental</h4>
                    <p className="highlight-text">Promoting eco-friendly fashion by extending the life cycle of designer attire through rental, reducing waste in Pune and Nagpur.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Change 5: Add Organization Schema Markup using Helmet */}
      {/* This should be placed within your main <Helmet> component at the top of HomePage.js */}
      {/* If you already have a Helmet component, add this script tag inside it. */}
      <Helmet>
        <script type="application/ld+json">
          {`
                {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "DOR - Dress On Rent",
                    "url": "https://www.your-website.com", // REPLACE with your actual website URL
                    "logo": "https://www.your-website.com/path/to/your/logo.png", // REPLACE with your logo image URL
                    "description": "DOR (Dress On Rent) offers luxury dress rentals for men and women in Pune and Nagpur, including designer gowns, lehengas, sherwanis, and suits for all special occasions. We provide affordable, eco-friendly, and hassle-free fashion rental services for weddings, parties, pre-wedding shoots, and corporate events.",
                    "sameAs": [
                        "https://www.facebook.com/your-facebook-page", // REPLACE with your actual Facebook URL
                        "https://www.instagram.com/your-instagram-page", // REPLACE with your actual Instagram URL
                        "https://twitter.com/your-twitter-handle" // REPLACE with your actual Twitter URL
                        // Add other social media links as needed
                    ],
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "Your Main Store Street Address, e.g., Shop No 5, ABC Towers", // REPLACE with your main store's street address for Pune
                        "addressLocality": "Pune",
                        "addressRegion": "Maharashtra",
                        "postalCode": "411001", // REPLACE with your main store's postal code for Pune
                        "addressCountry": "IN"
                    },
                    "contactPoint": {
                        "@type": "ContactPoint",
                        "telephone": "+91-98765-43210", // REPLACE with your primary contact number
                        "contactType": "customer service"
                    }
                }
            `}
        </script>
      </Helmet>

      {/* Footer */}
      <footer id="contact" className="footer">
  <div className="footer-container">
    <div className="footer-col">
      {/* SEO Change 1: Enhanced H3 heading with keywords */}
      <h3 className="footer-heading">DOR - Dress On Rent | Luxury Outfit Rentals in Pune & Nagpur</h3>
      <p className="footer-text">
        Your premier destination for high-quality lehenga on rent, sherwani on rent, gown on rent, and suit rentals in Pune and Nagpur. Elevate your style sustainably and affordably for any event with DOR Dress On Rent. We offer a convenient, hassle-free way to rent vs buy ethnic wear, ensuring you save money on wedding dress and other special occasion outfits.
      </p>
      <div className="social-links">
        {/* SEO Change 2: Updated social media links with actual URLs and rel attributes */}
        <a href="https://www.instagram.com/yourdorinstagram" target="_blank" rel="noopener noreferrer" className="social-icon animate-social-pop" aria-label="Visit DOR on Instagram"><Instagram size={24} /></a> {/* REPLACE with actual Instagram URL */}
        <a href="https://www.facebook.com/yourdorfacebook" target="_blank" rel="noopener noreferrer" className="social-icon animate-social-pop" aria-label="Visit DOR on Facebook"><Facebook size={24} /></a> {/* REPLACE with actual Facebook URL */}
        <a href="https://www.twitter.com/yourdortwitter" target="_blank" rel="noopener noreferrer" className="social-icon animate-social-pop" aria-label="Visit DOR on Twitter"><Twitter size={24} /></a> {/* REPLACE with actual Twitter URL */}
      </div>
    </div>

    <div className="footer-col">
      <h3 className="footer-heading">Quick Links for Dress Rentals</h3>
      <ul className="footer-list">
        {/* SEO Change 3: Ensure anchor links are descriptive */}
        <li><a href="#men" className="footer-link animate-footer-link-hover">Men's Rental Collection</a></li>
        <li><a href="#women" className="footer-link animate-footer-link-hover">Women's Rental Collection</a></li>
        <li><a href="#how-it-works" className="footer-link animate-footer-link-hover">How Dress Rental Works</a></li>
        <li><a href="#about-us" className="footer-link animate-footer-link-hover">About DOR Dress On Rent</a></li>
        <li><Link to="/faq" className="footer-link animate-footer-link-hover">FAQ for Dress Rentals</Link></li> {/* Assuming /faq is a separate page */}
      </ul>
    </div>

    <div className="footer-col">
      <h3 className="footer-heading">Contact DOR - Dress On Rent</h3>
      <ul className="footer-list">
        <li className="contact-item"><Mail size={18} className="icon-mr" /> info@DOR.com</li> {/* REPLACE with actual email */}
        <li className="contact-item"><Phone size={18} className="icon-mr" /> +91 98765 43210</li> {/* REPLACE with actual phone number */}
        <li className="contact-item align-start"><MapPin size={18} className="icon-mr mt-1" />
          <address className="address-text">
            Our Stores:<br />
            {/* SEO Change 4: Display full store names and addresses for local SEO */}
            {loadingStores ? 'Loading...' : storeError ? 'Error loading stores' :
              storeLocations.map(store => (
                <span key={store.id}>
                  {store.name}: [Your full address for {store.name} store, e.g., Shop No 5, ABC Towers, Wakad, Pune, Maharashtra 411057]<br />
                </span>
              ))
            }
            {/* Add specific addresses for Pune and Nagpur if available statically or fetched dynamically */}
            {/* Example static addresses: */}
            {/* Pune Store: Shop No. 101, XYZ Building, MG Road, Camp, Pune, Maharashtra 411001<br/> */}
            {/* Nagpur Store: 2nd Floor, PQR Plaza, Civil Lines, Nagpur, Maharashtra 440001<br/> */}
          </address>
        </li>
      </ul>
    </div>
  </div>
  <div className="copyright">
    &copy; {new Date().getFullYear()} DOR. All rights reserved.
  </div>
</footer>
    </div>
  );
}

export default HomePage;