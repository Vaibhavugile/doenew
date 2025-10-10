const functions = require("firebase-functions");
const axios = require("axios");

// Base URL for Shiprocket API
const SHIPROCKET_API_URL = "https://apiv2.shiprocket.in/v1/external";

// Your fixed warehouse/pickup Pincode
const MY_PICKUP_PINCODE = "411057";

/**
 * Gets an authentication token from Shiprocket.
 * @return {Promise<string>} The Shiprocket authentication token.
 * @throws {functions.https.HttpsError} If authentication fails.
 */
const getShiprocketToken = async () => {
  // CONFIRM THESE CREDENTIALS ARE CORRECT
  const email = "vr178511@gmail.com";
  const password = "on9fHgziW2CP!$Zz";

  if (!email || !password) {
    throw new functions.https.HttpsError(
        "internal",
        "Shiprocket API credentials are not set in the function.",
    );
  }

  try {
    const response = await axios.post(
        `${SHIPROCKET_API_URL}/auth/login`,
        {
          email: email,
          password: password,
        },
    );
    return response.data.token;
  } catch (error) {
    console.error("Error fetching Shiprocket token:",
        error.response?.data || error.message);
    // Throw a 401 if login specifically fails.
    if (error.response?.status === 401) {
      throw new functions.https.HttpsError(
          "unauthenticated",
          "Shiprocket login failed. Check your API email and password.",
      );
    }
    throw new functions.https.HttpsError(
        "internal",
        "Could not authenticate with Shiprocket.",
    );
  }
};

/**
 * Checks serviceability for a single logistics leg (forward or reverse).
 * IMPORTANT: Sets COD=0 for reverse shipments to maximize availability.
 * @param {string} token - Shiprocket authentication token.
 * @param {string} pickupPincode - Starting 6-digit Pincode.
 * @param {string} deliveryPincode - Destination 6-digit Pincode.
 * @param {boolean} isReverse - True if this is a r
 * @return {Promise<Object>} An obje
 * @throws {Error} Throws an
 */
const checkSingleLegServiceability =
    async (token, pickupPincode, deliveryPincode, isReverse = false) => {
      const codValue = isReverse ? 0 : 1;

      const requestData = {
        pickup_postcode: pickupPincode,
        delivery_postcode: deliveryPincode,
        cod: codValue,
        weight: "1.5", // Weight in kgs
      };

      const config = {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      };

      try {
        const response = await axios.get(
            `${SHIPROCKET_API_URL}/courier/serviceability/`,
            {
              params: requestData,
              headers: config.headers,
            },
        );

        // 1. Check for Shiprocket's own non-200 status or empty courier list
        if (response.data.status !== 200 ||
            response.data.data.available_courier_companies.length === 0) {
          throw new Error(`Shiprocket API confirmed
               no service available for route ${pickupPincode}
                to ${deliveryPincode} (COD=${codValue}).`);
        }

        const availableCouriers = response.data
            .data.available_courier_companies;
        let fastestCourier = availableCouriers[0];
        let cheapestCourier = availableCouriers[0];

        for (const courier of availableCouriers) {
          if (courier.etd < fastestCourier.etd) {
            fastestCourier = courier;
          }
          if (courier.rate < cheapestCourier.rate) {
            cheapestCourier = courier;
          }
        }
        return {
          fastest: {
            rate: Number(fastestCourier.rate),
            etd: fastestCourier.etd,
            courierName: fastestCourier.courier_name,
          },
          cheapest: {
            rate: Number(cheapestCourier.rate),
            etd: cheapestCourier.etd,
            courierName: cheapestCourier.courier_name,
          },
        };
      } catch (error) {
        // 2. Handle Axios HTTP/Network errors (like a 404 or 401)
        let specificErrorMessage = `Shiprocket request failed.`;

        if (error.response) {
          specificErrorMessage = `API Error Status
             ${error.response.status} for route
              ${pickupPincode} to ${deliveryPincode}.
               Check credentials or API URL.`;
        } else if (error.message.includes("confirmed no service")) {
          specificErrorMessage = error.message;
        } else {
          specificErrorMessage = `Network or
             configuration error: ${error.message}.`;
        }

        // Re-throw a clean error for the main function's catch block
        throw new Error(specificErrorMessage);
      }
    };


/**
 */
exports.checkPincodeServiceability =
functions.https.onCall(async (data, context) => {
  const pincodePayload = data.data;
  const customerPincode = pincodePayload ?
        pincodePayload.deliveryPincode : undefined;

  if (!customerPincode || typeof customerPincode !== "string" ||
        customerPincode.length !== 6 || !/^\d{6}$/.test(customerPincode)) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Please provide a valid 6-digit pincode.",
    );
  }

  try {
    const token = await getShiprocketToken();

    // 1. Forward Shipment Check (Delivery)
    const forwardResults = await checkSingleLegServiceability(
        token, MY_PICKUP_PINCODE, customerPincode, false,
    );

    // 2. Reverse Shipment Check (Return Pickup)
    const reverseResults = await checkSingleLegServiceability(
        token, customerPincode, MY_PICKUP_PINCODE, true,
    );

    // --- FINAL RETURN VALUE: DO NOT COMBINE OPTIONS ---
    // The frontend will now handle the combination and display.
    return {
      success: true,
      message: "Delivery & Return service available.",
      options: {
        // Forward (Delivery) Options
        forward: {
          cheapest: forwardResults.cheapest,
          fastest: forwardResults.fastest,
        },
        // Reverse (Return) Options
        reverse: {
          cheapest: reverseResults.cheapest,
          fastest: reverseResults.fastest,
        },
      },
    };
  } catch (error) {
    console.error("Error checking two-way serviceability:", error.message);
    throw new functions.https.HttpsError(
        "unknown",
        `An error occurred: ${error.message}. Please
         check if the Pincode is correct or try another one.`,
    );
  }
});
