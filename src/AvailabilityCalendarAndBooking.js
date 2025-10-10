import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; 
import { db, saveRentalOrder } from './firebaseConfig'; 
import { collection, query, where, getDocs } from 'firebase/firestore';

// Ensure all icons are imported correctly
import { IndianRupee, CalendarCheck, Clock, UserCheck, MessageSquare, ShoppingBag, XCircle, CreditCard, Loader2, ChevronLeft } from 'lucide-react';

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

const AvailabilityCalendarAndBooking = ({ productName, productRent, productId, selectedSize, selectedColor, forwardETD, reverseETD }) => {
    
    // --- State Management ---
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [bookingMessage, setBookingMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('dates'); // 'dates', 'checkout', 'confirmed'
    const [bookedPeriods, setBookedPeriods] = useState([]);
    const [fetchingBookings, setFetchingBookings] = useState(true);
    const bookingRef = useRef(null);

    // --- Constants ---
    const MAX_RENTAL_DAYS = 21; 

    // Calculate dynamic minimum selectable start date from TODAY
    const minDateAllowed = useMemo(() => {
        const forwardTransitDays = Number(forwardETD) || 0; 
        
        // Total buffer is Forward ETD (transit) + 1 day usage buffer
        const totalBookingBuffer = Math.max(1, forwardTransitDays + 1); 
        
        const d = new Date();
        d.setDate(d.getDate() + totalBookingBuffer); 
        return d;
    }, [forwardETD]);

    // --- Price Calculation (Assuming productRent is per day) ---
    const RENTAL_DAYS = startDate && endDate 
        ? 1 
        : 0;
    
    // Simple calculation
    const SUB_TOTAL = RENTAL_DAYS * Number(productRent);
    const SECURITY_DEPOSIT = 2500; // Example fixed deposit
    const DELIVERY_CHARGE = 0; // Adjust as needed
    const GRAND_TOTAL = SUB_TOTAL + SECURITY_DEPOSIT + DELIVERY_CHARGE;

    // --- Fetch Booked Periods ---
    const fetchBookedPeriods = useCallback(async () => {
        if (!productId || !selectedSize || !selectedColor) {
            setFetchingBookings(false);
            return;
        }

        setFetchingBookings(true);
        try {
            const today = new Date();
            const relevantBookingCutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate()); 

            // Fetching from the 'orders' collection
            const q = query(
                collection(db, 'orders'),
                where('productId', '==', productId),
                where('selectedSize', '==', selectedSize),
                where('selectedColor', '==', selectedColor),
                where('rentalEndDate', '>=', relevantBookingCutoff), // rentalEndDate is the final Receive Date
            );

            const querySnapshot = await getDocs(q);

            const fetchedBookings = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    start: data.rentalStartDate.toDate(), // SHIP DATE (Full Unavailability Start)
                    end: data.rentalEndDate.toDate(),     // RECEIVE BACK DATE (Full Unavailability End)
                };
            });
            
            setBookedPeriods(fetchedBookings);
        } catch (error) {
            console.error('Error fetching booked periods:', error);
            setBookingMessage('Failed to check availability.');
        } finally {
            setFetchingBookings(false);
        }
    }, [productId, selectedSize, selectedColor]); 

    useEffect(() => {
        fetchBookedPeriods();
    }, [fetchBookedPeriods]);


    // --- Availability Check and Calendar Coloring ---
    
    const isDateBooked = (date) => {
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        // --- UPDATED LOGIC HERE ---
        // New Post-Booking Buffer: F-ETD (2 days) + 1 day (Cleaning/Prep) + 1 day (Extra Buffer) = 4 days total
        const postBookingBufferDays = (Number(forwardETD) || 0) + 2; 

        return bookedPeriods.some(period => {
            const periodStart = new Date(period.start.getFullYear(), period.start.getMonth(), period.start.getDate());
            const periodEnd = new Date(period.end.getFullYear(), period.end.getMonth(), period.end.getDate());
            
            // --- 1. The primary booked window (Ship Date to Return Receive Date) ---
            if (checkDate >= periodStart && checkDate <= periodEnd) {
                 return true; 
            }
            
            // --- 2. The post-booking buffer window (Blocks the days needed for prep/transit for the *next* customer) ---
            
            // Buffer Start: Day after item is received back (periodEnd + 1). 
            const bufferStart = new Date(periodEnd);
            bufferStart.setDate(periodEnd.getDate() + 1); 
            
            // Buffer End: The last day the item is blocked. 
            const bufferEnd = new Date(periodEnd);
            bufferEnd.setDate(periodEnd.getDate() + postBookingBufferDays); 
            
            if (checkDate >= bufferStart && checkDate <= bufferEnd) {
                 return true; 
            }

            return false;
        });
    };
    
    const highlightBookedDays = (date) => {
        if (isDateBooked(date)) {
            return 'booked-day';
        }
        return '';
    };

    // Function to check if a date is valid for selection as a START date
    const isDateValidForStart = (date) => {
        // 1. Must be on or after the calculated logistics buffer date from TODAY.
        if (date < minDateAllowed) {
            return false;
        }

        // 2. Must not fall on any blocked day (existing booking OR post-booking buffer).
        if (isDateBooked(date)) {
            return false;
        }
        
        return true;
    };


    // --- Handle single date selection ---
    const onChangeDates = (date) => {
        setStartDate(date);
        setEndDate(date); 
        setBookingMessage('');
    };
    
    // --- Handle Date Selection (VALIDATION before moving to checkout) ---
    const handleDateSelection = async (e) => {
        e.preventDefault();
        if (!startDate) { 
            setBookingMessage('Please select a single date for the rental.');
            return;
        }
        
        // Final availability check is still needed, although for a single day.
        if (isDateBooked(startDate)) {
             setBookingMessage(`The selected date (${formatDate(startDate)}) is unavailable.`);
             return;
        }
        
        setBookingMessage('');
        setStep('checkout');
    };
    
    // --- Final Booking Confirmation Logic (No Change to Buffer Logic) ---
    const handleBookingConfirmation = async () => {
        setLoading(true);
        setBookingMessage('');

        const forwardDays = Number(forwardETD) || 0;
        const reverseDays = Number(reverseETD) || 0;
        const PREP_DAY_BUFFER = 1; 

        // 1. Calculate the NEW rentalStartDate (SHIP DATE)
        // Start Date - Forward Transit Days - 1 (Prep/Buffer)
        const shipDate = new Date(startDate);
        shipDate.setDate(startDate.getDate() - forwardDays - PREP_DAY_BUFFER);

        // 2. Calculate the NEW rentalEndDate (RETURN RECEIVE DATE)
        const userEndDate = new Date(endDate); // Will be the same as startDate
        const returnPickupDay = new Date(userEndDate);
        // Add 1 day buffer for pickup
        returnPickupDay.setDate(userEndDate.getDate() + 1); 

        // Add reverse transit days
        const receiveBackDate = new Date(returnPickupDay);
        receiveBackDate.setDate(returnPickupDay.getDate() + reverseDays); 

        // Calculate user's usage duration for billing/reporting (always 1 day now)
        const userRentalDays = RENTAL_DAYS; // Will be 1

        const orderData = {
            productId: productId,
            productName: productName,
            productRent: Number(productRent),
            selectedSize: selectedSize,
            selectedColor: selectedColor,
            
            // SAVING THE FULL UNAVAILABILITY WINDOW (Ship Date to Receive Back Date)
            rentalStartDate: shipDate,        
            rentalEndDate: receiveBackDate,  
            
            // Saving the customer's usage dates for reference/billing
            customerUseStartDate: startDate,
            customerUseEndDate: endDate,
            
            rentalDays: userRentalDays,
            totalPrice: GRAND_TOTAL,
            orderDate: new Date(),
            status: 'Pending Payment',
        };

        try {
             await saveRentalOrder(orderData); 
             setBookingMessage('Booking confirmed successfully! You will be redirected to the payment gateway.');
             setStep('confirmed');
        } catch (error) {
            console.error('Booking failed:', error);
            setBookingMessage('Booking failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // --- Rendering Functions ---

    const renderDateSelection = () => (
        <form onSubmit={handleDateSelection} className="booking-form-content">
            <h5 className="text-lg font-bold mb-3 text-blue-700 flex items-center"> 
                <CalendarCheck size={20} className="icon-mr" /> Step 1: Select Rental Date 
            </h5>
            
            <p className="text-sm text-gray-500 mb-4">
                This is a single-day rental product. Please choose the date you wish to **use** the product.
                The earliest available **date** is **{minDateAllowed.toDateString()}**, which includes 
                the {Number(forwardETD) || 0} day delivery transit time plus a 1-day buffer for your use.
            </p>

            {fetchingBookings ? (
                <div className="flex items-center justify-center p-8 text-gray-500">
                    <Loader2 size={24} className="animate-spin icon-mr" /> Checking availability...
                </div>
            ) : ( 
            <div className="calendar-container">
                <DatePicker
                    selected={startDate}
                    onChange={onChangeDates}
                    inline
                    minDate={minDateAllowed} 
                    monthsShown={1}
                    filterDate={isDateValidForStart}
                    dayClassName={highlightBookedDays}
                    placeholderText="Select rental date"
                    readOnly={fetchingBookings}
                />
            </div>
            )}

            <div className={`mt-4 p-3 rounded text-center ${bookingMessage.includes('unavailable') || bookingMessage.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {bookingMessage || (startDate ? `You have selected a single-day rental for ${formatDate(startDate)}.` : 'Please select your desired date.')}
            </div>

            <button 
                type="submit" 
                className="btn btn-primary w-full mt-4" 
                disabled={!startDate || loading || !!bookingMessage}
            >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Proceed to Checkout'}
            </button>
        </form>
    );

    const renderCheckoutSummary = () => (
        <div className="checkout-summary">
            <h5 className="text-lg font-bold mb-4 text-blue-700 flex items-center">
                <CreditCard size={20} className="icon-mr" /> Step 2: Checkout Summary
            </h5>

            <div className="summary-details border p-4 rounded mb-4 bg-gray-50">
                <p><strong>Product:</strong> {productName}</p>
                <p><strong>Size:</strong> {selectedSize} | <strong>Color:</strong> {selectedColor}</p>
                <p><strong>Period:</strong> {formatDate(startDate)} ({RENTAL_DAYS} day)</p>
            </div>

            <div className="price-breakdown mb-4">
                <div className="flex justify-between"><span>Rental Fee ({RENTAL_DAYS} day x ₹{productRent})</span><span><IndianRupee size={14} className="inline-icon" />{SUB_TOTAL.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Security Deposit</span><span><IndianRupee size={14} className="inline-icon" />{SECURITY_DEPOSIT.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Delivery/Pickup Charge</span><span><IndianRupee size={14} className="inline-icon" />{DELIVERY_CHARGE.toLocaleString('en-IN')}</span></div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-lg text-blue-700"><span>Grand Total</span><span><IndianRupee size={18} className="inline-icon" />{GRAND_TOTAL.toLocaleString('en-IN')}</span></div>
            </div>

            <button 
                onClick={handleBookingConfirmation} 
                className="btn btn-success w-full mt-4 flex items-center justify-center" 
                disabled={loading}
            >
                {loading ? <Loader2 size={18} className="animate-spin icon-mr" /> : <CreditCard size={18} className="icon-mr" />}
                {loading ? 'Processing...' : 'Confirm Booking & Pay'}
            </button>
            <button onClick={() => setStep('dates')} className="btn btn-secondary w-full mt-2">
                <ChevronLeft size={18} className="icon-mr" /> Back to Dates
            </button>
        </div>
    );

    const renderConfirmation = () => (
        <div className="confirmation-screen p-6 text-center bg-green-50 rounded-lg shadow-lg">
            <UserCheck size={48} className="text-green-600 mx-auto mb-4" />
            <h5 className="text-xl font-bold text-green-700 mb-2">Booking Successful!</h5>
            <p className="text-gray-600 mb-4">{bookingMessage}</p>
            
            <div className="summary-details border p-4 rounded bg-white">
                <p><strong>Product:</strong> {productName}</p>
                <p><strong>Period:</strong> {formatDate(startDate)}</p>
                <p><strong>Grand Total:</strong> <IndianRupee size={16} className="inline-icon" />{GRAND_TOTAL.toLocaleString('en-IN')}</p>
            </div>
             <a 
                href={`https://wa.me/+91XXXXXXXXXX?text=${encodeURIComponent(`I have placed a new order. Order details: Product ID: ${productId}, Size: ${selectedSize}, Date: ${formatDate(startDate)}. Please check the database.`)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary mt-4 w-full whatsapp-button"
             >
                <MessageSquare size={18} className="icon-mr" /> Contact Customer Support
             </a>
        </div>
    );
    
    return (
        <div ref={bookingRef}> 
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