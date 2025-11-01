// ---- top of functions/index.js (if not already present) ----
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage as getAdminStorage} from "firebase-admin/storage";
import {onCall, HttpsError} from "firebase-functions/v2/https";

// Pin default bucket (must be *.appspot.com)
initializeApp({storageBucket: "pidr-c644e.appspot.com"});
const db = getFirestore();
const bucket = getAdminStorage().bucket();

// ------------------------------------------------------------
// commitProductRow — finalize one CSV row
// Copies from inbox/* → products/{gender}/{categoryId}/{productId}/...
// and writes the Firestore product doc.
// ------------------------------------------------------------
export const commitProductRow = onCall(
    {region: "asia-south1", timeoutSeconds: 540, memory: "1GiB"},
    async (req) => {
      const data = req.data || {};

      // Extract & normalize inputs
      const genderRaw = (data.gender || "").toString().trim().toLowerCase();
      const gender = genderRaw === "men" ? "men" :
       genderRaw === "women" ? "women" : null;
      if (!gender) {
        throw new HttpsError("invalid-argument",
            "gender must be \"men\" or \"women\"");
      }

      const categoryIdInput = (data.categoryId || "").toString().trim();
      const categoryNameInput = (data.categoryName || "").toString().trim();
      if (!categoryIdInput && !categoryNameInput) {
        throw new HttpsError("invalid-argument",
            "Provide categoryId or categoryName");
      }

      const mainImagePath = (data.mainImagePath || "").toString().trim();
      if (!mainImagePath) {
        throw new
        HttpsError("invalid-argument", "mainImagePath is required");
      }

      // galleryImagePaths can be an array or a pipe-separated string
      let galleryImagePaths = data.galleryImagePaths || [];
      if (typeof galleryImagePaths === "string") {
        galleryImagePaths =
        galleryImagePaths.split("|").map((s) => s.trim()).filter(Boolean);
      } else if (Array.isArray(galleryImagePaths)) {
        galleryImagePaths =
        galleryImagePaths.map((s) => (s || "")
            .toString().trim()).filter(Boolean);
      } else {
        galleryImagePaths = [];
      }

      // Other product fields
      const productCode = (data.productCode || "").toString().trim() || null;
      const name = (data.name || "").toString().trim();
      const description = (data.description || "").toString().trim();
      const originalPrice = data.originalPrice ?
       Number(data.originalPrice) : null;
      const rent = data.rent ? Number(data.rent) : 0;
      const color = (data.color || "").toString().trim();

      // Sizes/stores may be arrays or pipe-separated strings
      const normPipeOrArray = (val) =>
      Array.isArray(val) ?
        val.map((s) => (s || "").toString().trim()).filter(Boolean) :
        (val || "").toString().split("|")
            .map((s) => s.trim()).filter(Boolean);

      const sizes = normPipeOrArray(data.sizes);
      const availableStores = normPipeOrArray(data.stores);

      const material = (data.material || "").toString().trim() || null;
      const careInstructions =
      (data.careInstructions || "").toString().trim() || null;

      // Resolve Firestore collection by gender
      const col = gender === "men" ? "menCategories" : "womenCategories";

      // 1) Resolve or create category
      let categoryId = categoryIdInput;
      if (!categoryId) {
        const snap = await db.collection(col)
            .where("name", "==", categoryNameInput).limit(1).get();
        if (!snap.empty) {
          categoryId = snap.docs[0].id;
        } else {
          const created = await db.collection(col).add({
            name: categoryNameInput,
            order: 0,
            imageUrl: null,
            addedDate: new Date().toISOString(),
          });
          categoryId = created.id;
        }
      }

      // 2) Create product doc with basic fields (no images yet)
      const prodRef = db.collection(col)
          .doc(categoryId).collection("products").doc();
      await prodRef.set(
          {
            name,
            description,
            productCode,
            originalPrice: originalPrice ?? null,
            rent: rent ?? 0,
            color,
            sizes,
            material,
            careInstructions,
            availableStores,
            addedDate: new Date().toISOString(),
          },
          {merge: true},
      );
      const productId = prodRef.id;

      const heroDest = `products/${gender}/${categoryId}/
      ${productId}/hero.jpg`;
      await bucket.file(mainImagePath).copy(bucket.file(heroDest));

      // 4) Copy gallery images (optional)
      for (let i = 0; i < galleryImagePaths.length; i++) {
        const src = galleryImagePaths[i];
        const dest = `products/${gender}/${categoryId}
        /${productId}/gallery/${i + 1}.jpg`;
        await bucket.file(src).copy(bucket.file(dest));
      }

      // 5) (Optional) return info to UI
      return {ok: true, productId, categoryId};
    },
);
