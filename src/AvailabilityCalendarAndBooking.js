import React, { useState, useMemo, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; 
import { db, saveRentalOrder } from './firebaseConfig'; 
import { collection, query, where, getDocs } from 'firebase/firestore';

// Ensure all icons are imported correctly
import { IndianRupee, CalendarCheck, Clock, UserCheck, MessageSquare, ShoppingBag, XCircle, CreditCard, Loader2 } from 'lucide-react';

// Utility function to format date
const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date.toDate ? date.toDate() : date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
};

const AvailabilityCalendarAndBooking = ({ productName, productRent, productId, selectedSize, selectedColor }) => {
    
    // --- State Management ---
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [bookingMessage, setBookingMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('dates');
    const [bookedPeriods, setBookedPeriods] = useState([]); 
    const [fetchingAvailability, setFetchingAvailability] = useState(true);

    // --- SCROLLING FIX: Create Ref for the component's root element ---
    const bookingRef = useRef(null); 

    // --- Constants ---
    const MIN_RENTAL_DAYS = 7; 
    const STANDARD_RENTAL_DAYS = 7; 
    const DELIVERY_BUFFER_DAYS = 3; 
    const MAX_RENTAL_DAYS = 21; 

    const minDateAllowed = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + DELIVERY_BUFFER_DAYS);
        return d;
    }, []);

    // --- Data Fetching: REAL AVAILABILITY FROM FIRESTORE ---
    useEffect(() => {
        const fetchBookedPeriods = async () => {
            if (!productId) return;
            setFetchingAvailability(true);
            setBookedPeriods([]);

            try {
                const ordersRef = collection(db, 'orders');
                const q = query(
                    ordersRef,
                    where('productCode', '==', productId),
                    where('orderStatus', 'in', ['Confirmed', 'Awaiting Payment', 'Rented']) 
                );
                
                const querySnapshot = await getDocs(q);
                
                const fetchedBookings = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        start: data.rentalStartDate.toDate(),
                        end: data.rentalEndDate.toDate(),
                    };
                });

                setBookedPeriods(fetchedBookings);
                console.log("FETCH: Successfully loaded booked periods for product:", productId, fetchedBookings);

            } catch (error) {
                console.error("FETCH ERROR: Error fetching booked periods:", error);
                setBookingMessage("Failed to load availability. Please try refreshing.");
            } finally {
                setFetchingAvailability(false);
            }
        };

        fetchBookedPeriods();
    }, [productId]);


    // --- Derived State (Calculations) ---

    // New (Correct) Calculation:
const rentalDays = useMemo(() => {
    if (startDate && endDate) {
        // 1. Convert dates to start of day to remove time zone issues
        const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        // 2. Calculate difference in milliseconds
        const diffTime = Math.abs(end.getTime() - start.getTime());
        
        // 3. Convert milliseconds to days. +1 to include both start and end days.
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Return the number of days. If dates are the same, this will be 0. We want 1 day.
        return diffDays + 1; 
    }
    return 0;
}, [startDate, endDate]);

    const { totalRentPrice, extraDays } = useMemo(() => {
        const extra = Math.max(0, rentalDays - STANDARD_RENTAL_DAYS);
        const dailyRent = productRent / STANDARD_RENTAL_DAYS; 
        const extraCharge = extra * dailyRent;
        const finalPrice = productRent + extraCharge;

        return { totalRentPrice: Math.ceil(finalPrice), extraDays: extra };
    }, [rentalDays, productRent]);
    
    const SECURITY_DEPOSIT = 2500; 
    const DELIVERY_CHARGE = 250;
    const GRAND_TOTAL = totalRentPrice + SECURITY_DEPOSIT + DELIVERY_CHARGE;

    // --- Availability Check and Calendar Coloring ---

    const isDateBooked = (date) => {
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        return bookedPeriods.some(period => {
            const periodStart = new Date(period.start.getFullYear(), period.start.getMonth(), period.start.getDate());
            const periodEnd = new Date(period.end.getFullYear(), period.end.getMonth(), period.end.getDate());
            return checkDate >= periodStart && checkDate <= periodEnd;
        });
    };

    const isDateValidForStart = (date) => {
        if (date < minDateAllowed) return false;
        if (isDateBooked(date)) return false; 
        return true;
    };

    // In AvailabilityCalendarAndBooking.js
const onChangeDates = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);

    let currentRentalDays = 0; // Initialize a local variable for immediate check

    if (start && end) {
        // Recalculate days locally for immediate validation
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const diffTime = Math.abs(endDay.getTime() - startDay.getTime());
        currentRentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const isOverlap = bookedPeriods.some(period => {
            return (start <= period.end && end >= period.start);
        });

        if (isOverlap) {
            setBookingMessage("Selected date range overlaps with an existing booking. Please choose available green dates.");
        } 
        // Use the local variable here for accurate, real-time feedback
        else if (currentRentalDays < MIN_RENTAL_DAYS || currentRentalDays > MAX_RENTAL_DAYS) {
             setBookingMessage(`Rental period must be between ${MIN_RENTAL_DAYS} and ${MAX_RENTAL_DAYS} days. Selected ${currentRentalDays} days.`);
        } 
        else {
            setBookingMessage('');
        }
    } else {
        setBookingMessage('');
    }
};
    
    const highlightBookedDays = (date) => {
        if (isDateBooked(date)) {
            return 'booked-day';
        }
        return 'available-day';
    };
    
    const isReadyForBooking = startDate && endDate && rentalDays >= MIN_RENTAL_DAYS && rentalDays <= MAX_RENTAL_DAYS && selectedSize && !bookingMessage;


    // --- Handlers ---

    const handleDateSelection = (e) => {
        e.preventDefault();
        
        if (!isReadyForBooking) {
            setBookingMessage("Please select a valid, available date range and size before proceeding.");
            console.error("VALIDATION FAIL: isReadyForBooking is false.");
            return;
        }
        if (!selectedSize) {
             setBookingMessage("Please select a valid size on the main product details page first.");
             console.error("VALIDATION FAIL: selectedSize is missing.");
            return;
        }

        setBookingMessage('');
        setStep('checkout');
        
        // --- CONSOLE LOG TO CONFIRM STATE CHANGE AND SCROLL ATTEMPT ---
        console.log("STATE CHANGE: Transitioned to step 'checkout'. Scrolling attempted.");

        // --- SCROLL TO TOP OF BOOKING SECTION ---
        if (bookingRef.current) {
            bookingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    
    const handleFinalBooking = async (e) => {
        e.preventDefault();
        setLoading(true);
        setBookingMessage('');
        
        const orderData = {
            productName,
            productCode: productId,
            productRent,
            selectedSize,
            selectedColor,
            rentalStartDate: startDate,
            rentalEndDate: endDate,
            rentalDays,
            totalRentPrice,
            securityDeposit: SECURITY_DEPOSIT,
            deliveryCharge: DELIVERY_CHARGE,
            grandTotal: GRAND_TOTAL,
        };

        try {
            const orderId = await saveRentalOrder(orderData);
            console.log("ORDER: Saved order to DB with ID:", orderId);

            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setBookingMessage(`Order placed successfully! Please proceed to payment. Order ID: ${orderId}`);
            setStep('confirmed');
            
            setBookedPeriods(prev => [...prev, { start: startDate, end: endDate }]);
            
            console.log("STATE CHANGE: Transitioned to step 'confirmed'. Scrolling attempted.");

            // --- SCROLL TO TOP OF BOOKING SECTION ---
            if (bookingRef.current) {
                bookingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

        } catch (error) {
            console.error("BOOKING ERROR: Failed to finalize booking:", error);
            setBookingMessage(`Booking failed: ${error.message}. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    // --- Render Functions ---

    const renderDateSelection = () => (
        <form onSubmit={handleDateSelection} className="booking-form-content">
            <h5 className="text-lg font-bold mb-3 text-blue-700 flex items-center">
                <CalendarCheck size={20} className="icon-mr" /> Step 1: Select Rental Period (Min 7 Days)
            </h5>
            
            {fetchingAvailability ? (
                <div className="message-container loading">
                    <Loader2 size={36} className="animate-spin text-blue-500" /> 
                    <p className="message-text mt-2">Checking availability...</p>
                </div>
            ) : (
                <div className="calendar-container">
                    <DatePicker
                        selected={startDate}
                        onChange={onChangeDates}
                        startDate={startDate}
                        endDate={endDate}
                        selectsRange
                        inline
                        minDate={minDateAllowed}
                        monthsShown={1} 
                        filterDate={isDateValidForStart} 
                        dayClassName={highlightBookedDays}
                        placeholderText="Select rental start and end date"
                        readOnly={fetchingAvailability}
                    />
                </div>
            )}
            
            <div className="rental-summary mt-4">
                <p className="text-blue-600 font-semibold mb-2">
                    <Clock size={16} className="inline-icon" /> Base rental period is **{STANDARD_RENTAL_DAYS} days**.
                </p>
                {startDate && endDate ? (
                    <>
                        <p className={`font-bold ${isReadyForBooking ? 'text-green-600' : 'text-orange-600'}`}>
                            <CalendarCheck size={16} className="inline-icon" /> Selected Duration: **{rentalDays} days**
                            {extraDays > 0 && <span className="text-orange-500"> (+{extraDays} extra day{extraDays > 1 ? 's' : ''})</span>}
                        </p>
                        <p className="mt-2">
                            <IndianRupee size={16} className="inline-icon" /> **Estimated Rent:** {totalRentPrice.toLocaleString('en-IN')}
                        </p>
                    </>
                ) : (
                    <p className="text-gray-500">Select a range on the calendar above.</p>
                )}
                
                {(!selectedSize) && (
                     <p className="mt-2 text-red-600"><XCircle size={16} className="inline-icon" /> **Please select a Size on the product page first.**</p>
                )}
            </div>

            {bookingMessage && (
                <div className="booking-message mt-3 p-2 rounded text-sm bg-red-100 text-red-700">
                    {bookingMessage}
                </div>
            )}

            <button 
                type="submit"
                className="btn btn-primary book-online-button mt-4"
                disabled={!isReadyForBooking || fetchingAvailability}
            >
                <UserCheck size={20} className="icon-mr" /> Proceed to Checkout
            </button>
        </form>
    );

    const renderCheckoutSummary = () => (
        <div className="checkout-summary-content">
            <h4 className="font-bold text-xl mb-3 flex items-center">
                <ShoppingBag size={24} className="icon-mr text-blue-600" /> Step 2: Checkout Summary
                <button 
                    onClick={() => { setStep('dates'); setBookingMessage(''); }} 
                    className="btn btn-link ml-auto text-sm"
                >
                    &larr; Change Dates/Size
                </button>
            </h4>

            <div className="summary-details">
                <p><strong>Product:</strong> {productName}</p>
                <p><strong>Selected Size:</strong> {selectedSize}</p>
                <p><strong>Rental Period:</strong> **{formatDate(startDate)}** to **{formatDate(endDate)}** ({rentalDays} days)</p>
            </div>
            
            <div className="price-breakdown">
                <h5 className="breakdown-heading">Price Details</h5>
                <div className="price-item">
                    <span>Base Rental Fee ({STANDARD_RENTAL_DAYS} days)</span>
                    <span><IndianRupee size={14} className="inline-icon" />{productRent.toLocaleString('en-IN')}</span>
                </div>
                {extraDays > 0 && (
                    <div className="price-item extra-days">
                        <span>Extra Day Charge ({extraDays} day{extraDays > 1 ? 's' : ''})</span>
                        <span><IndianRupee size={14} className="inline-icon" />{(totalRentPrice - productRent).toLocaleString('en-IN')}</span>
                    </div>
                )}
                <div className="price-item">
                    <span>Security Deposit (Refundable)</span>
                    <span><IndianRupee size={14} className="inline-icon" />{SECURITY_DEPOSIT.toLocaleString('en-IN')}</span>
                </div>
                <div className="price-item">
                    <span>Delivery Charge (Pan India)</span>
                    <span><IndianRupee size={14} className="inline-icon" />{DELIVERY_CHARGE.toLocaleString('en-IN')}</span>
                </div>
                <div className="price-item total-row">
                    <span>**Grand Total**</span>
                    <span>**<IndianRupee size={16} className="inline-icon" />{GRAND_TOTAL.toLocaleString('en-IN')}**</span>
                </div>
            </div>
            
            {bookingMessage && (
                <div className="booking-message mt-3 p-2 rounded text-sm bg-red-100 text-red-700">
                    {bookingMessage}
                </div>
            )}
            
            <button 
                onClick={handleFinalBooking}
                className="btn btn-primary book-online-button mt-4"
                disabled={loading}
            >
                {loading ? (
                    <>
                        <Clock size={20} className="loading-spinner icon-mr" /> Saving Order & Redirecting...
                    </>
                ) : (
                    <>
                        <CreditCard size={20} className="icon-mr" /> Confirm & Pay <IndianRupee size={18} className="inline-icon" />{GRAND_TOTAL.toLocaleString('en-IN')}
                    </>
                )}
            </button>
            <p className="booking-note mt-2 text-sm text-gray-600">
                Clicking Confirm will save your order and redirect you to the payment gateway.
            </p>
        </div>
    );

    const renderConfirmation = () => (
        <div className="booking-status-box success">
            <CalendarCheck size={36} className="icon-mr text-green-700" />
            <h4 className="font-bold text-2xl mb-2">Order Placed! (Awaiting Payment) 🎉</h4>
            <p className="text-lg">{bookingMessage}</p>
            <div className="mt-4 p-4 bg-white rounded-md border border-green-300 text-left">
                <p><strong>Product:</strong> {productName}</p>
                <p><strong>Period:</strong> {formatDate(startDate)} to {formatDate(endDate)}</p>
                <p><strong>Grand Total:</strong> <IndianRupee size={16} className="inline-icon" />{GRAND_TOTAL.toLocaleString('en-IN')}</p>
            </div>
             <a 
                href={`https://wa.me/+91XXXXXXXXXX?text=${encodeURIComponent(`I have placed a new order. Order details: Product ID: ${productId}, Size: ${selectedSize}, Dates: ${formatDate(startDate)} to ${formatDate(endDate)}. Please check the database.`)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary mt-4 w-full whatsapp-button"
             >
                <MessageSquare size={18} className="icon-mr" /> Contact Customer Support
             </a>
        </div>
    );
    
    return (
        <div ref={bookingRef}> {/* ATTACH THE REF HERE */}
            {(() => {
                switch (step) {
                    case 'dates':
                        return renderDateSelection();
                    case 'checkout':
                        return renderCheckoutSummary();
                    case 'confirmed':
                        return renderConfirmation();
                    default:
                        return renderDateSelection();
                }
            })()}
        </div>
    );
};

export default AvailabilityCalendarAndBooking;