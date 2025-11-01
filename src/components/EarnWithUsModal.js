// src/components/EarnWithUsModal.js
import React from 'react';
import './EarnWithUsModal.css'; // Import its dedicated styles
import { Shirt, Sparkles, Crown, X, ChevronRight } from 'lucide-react'; 

const EarnWithUsModal = ({ showEarnModal, setShowEarnModal, theme }) => {
    // Return null if the modal should not be visible
    if (!showEarnModal) {
        return null;
    }

    // Determine the theme class to apply to the overlay
    // If 'light', this will be 'light-theme'. If 'dark', 'dark-theme'.
    const themeClass = `${theme}-theme`; 

    return (
        // 👇 FIX: Apply the theme class to the outer modal-overlay for variable inheritance
        <div className={`modal-overlay animate-fade-in ${themeClass}`} onClick={() => setShowEarnModal(false)}>
            <div
                // The content uses the base styles which pull from the now-themed parent
                className={`modal-content earn-modal-content animate-pop-in`}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <button
                    className="modal-close-button"
                    onClick={() => setShowEarnModal(false)}
                    aria-label="Close Earn with Us Modal"
                >
                    <X size={24} />
                </button>

                <h2 className="modal-title">Earn with DOR: Our 3-Step Program</h2>
                <p className="modal-description">Give your unused outfits a new life and earn store credit to refresh your wardrobe!</p>

                <div className="earn-steps-container">
                    {/* Step 1: Give Your Outfit */}
                    <div className="earn-step">
                        <div className="step-icon-wrapper">
                            <Shirt size={32} className="step-icon" />
                        </div>
                        <h3 className="step-title">1. Give Your Outfit</h3>
                        <p className="step-description">Drop off your gently used ethnic wear (Lehengas, Sherwanis, Gowns) at one of our stores.</p>
                    </div>

                    {/* Separator for desktop view */}
                    <div className="step-separator-desktop">
                        <ChevronRight size={30} className="separator-icon" />
                    </div>

                    {/* Step 2: Get Credit Note */}
                    <div className="earn-step">
                        <div className="step-icon-wrapper">
                            <Sparkles size={32} className="step-icon" />
                        </div>
                        <h3 className="step-title">2. Get Credit Note</h3>
                        <p className="step-description">Our experts will assess the item's condition and value, and you'll receive a credit note instantly.</p>
                    </div>

                    {/* Separator for desktop view */}
                    <div className="step-separator-desktop">
                        <ChevronRight size={30} className="separator-icon" />
                    </div>

                    {/* Step 3: Use It With Our Stores */}
                    <div className="earn-step">
                        <div className="step-icon-wrapper">
                            <Crown size={32} className="step-icon" />
                        </div>
                        <h3 className="step-title">3. Use It With Our Stores</h3>
                        <p className="step-description">Redeem your credit note for any rental or purchase from our exclusive DOR collections.</p>
                    </div>
                </div>

                <button
                    className="btn btn-primary mt-6 w-full"
                    onClick={() => setShowEarnModal(false)}
                >
                    Understood, Start Earning Today!
                </button>
            </div>
        </div>
    );
};

export default EarnWithUsModal;