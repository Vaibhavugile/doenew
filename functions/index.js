// functions/index.js

const functions = require("firebase-functions");
const axios = require("axios");

// Base URL for Shiprocket API
const SHIPROCKET_API_URL = "https://apiv2.shiprocket.in/v1/external";

/**
 * Gets an authentication token from Shiprocket.
 * This token is short-lived and needs to be fetched for each set of requests.
 */
const getShiprocketToken = async () => {
  // ⚠️ WARNING: Hardcoded credentials for testing only.
  // Replace these placeholders with your actual Shiprocket API credentials.
  const email = "vr178511@gmail.com";
  const password = "on9fHgziW2CP!$Zz";

  if (!email || !password) {
    throw new functions.https.HttpsError(
        "internal",
        "Shiprocket API credentials are not set in the function.",
    );
  }

  try {
    const response = await axios.post(`${SHIPROCKET_API_URL}/auth/login`, {
      email: email,
      password: password,
    });
    return response.data.token;
  } catch (error) {
    console.error("Error fetching Shiprocket token:",
        error.response?.data || error.message);
    throw new functions.https.HttpsError(
        "internal",
        "Could not authenticate with Shiprocket.",
    );
  }
};


/**
 * A callable Cloud Function to check pincode serviceability.
 */
exports.checkPincodeServiceability =
functions.https.onCall(async (data, context) => {
  const pincodePayload = data.data;

  // Now, access the deliveryPincode from the nested payload.
  const deliveryPincode = pincodePayload ?
   pincodePayload.deliveryPincode : undefined;

  // Add logging to confirm the fix
  console.log("Pincode Accessed via data.data.deliveryPincode:",
      deliveryPincode);

  if (!deliveryPincode || typeof deliveryPincode !== "string" ||
         deliveryPincode.length !== 6 || !/^\d{6}$/.test(deliveryPincode)) {
    console.error("Validation failed. Pincode was:", deliveryPincode);
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Please provide a valid 6-digit pincode.",
    );
  }

  try {
    const token = await getShiprocketToken();

    // These are required parameters by Shiprocket.
    // Replace with your actual pickup postcode and average product weight.
    const requestData = {
      pickup_postcode: "412101", // Your warehouse/pickup pincode
      delivery_postcode: deliveryPincode,
      cod: 1, // 1 for Cash on Delivery, 0 for Prepaid
      weight: "0.5", // Weight in kgs (e.g., 500g)
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    };

    const response =
    await axios.get(`${SHIPROCKET_API_URL}/courier/serviceability/`, {
      params: requestData,
      headers: config.headers,
    });

    // Check if the API call was successful and data exists
    if (response.data && response.data.status === 200 &&
         response.data.data.available_courier_companies.length > 0) {
      const availableCouriers = response.data.data.available_courier_companies;

      let fastestCourier = availableCouriers[0];
      for (const courier of availableCouriers) {
        if (courier.etd < fastestCourier.etd) {
          fastestCourier = courier;
        }
      }

      return {
        success: true,
        message: `Delivery available! Estimated
         delivery by ${fastestCourier.etd}.`,
        estimatedDate: fastestCourier.etd,
        courierName: fastestCourier.courier_name,
      };
    } else {
      return {
        success: false,
        message: "Sorry, delivery is not available for this pincode.",
      };
    }
  } catch (error) {
    console.error("Error checking serviceability:",
        error.response?.data || error.message);
    throw new functions.https.HttpsError(
        "unknown",
        "An error occurred while checking the pincode. Please try again later.",
    );
  }
});
