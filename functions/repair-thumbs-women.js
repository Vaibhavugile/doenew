// Run with:  node repair-thumbs-women.js
// (Must be executed inside the `functions` folder)

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

initializeApp({ storageBucket: "pidr-c644e.firebasestorage.app" });

const db = getFirestore();
const bucket = getStorage().bucket();

async function repairWomen() {
  console.log("🔍 Gathering Women products...");

  const col = "womenCategories";
  const catSnap = await db.collection(col).get();
  let count = 0;

  for (const catDoc of catSnap.docs) {
    const categoryId = catDoc.id;
    const prodSnap = await catDoc.ref.collection("products").get();

    for (const prodDoc of prodSnap.docs) {
      const productId = prodDoc.id;
      const heroPath = `products/women/${categoryId}/${productId}/hero.jpg`;

      console.log(`♻️ Re-triggering: ${heroPath}`);

      try {
        const tempDest = `products/women/${categoryId}/${productId}/hero_retrigger.jpg`;

        // Copy → re-copy → delete temp to fire `onProductImage`
        await bucket.file(heroPath).copy(bucket.file(tempDest));
        await bucket.file(tempDest).copy(bucket.file(heroPath));
        await bucket.file(tempDest).delete();

        count++;
      } catch (err) {
        console.warn(`⚠️ Skip failed image ${heroPath}:`, err.message);
      }
    }
  }

  console.log(`✅ Done! Regenerated thumbnails for ${count} Women products.`);
  process.exit(0);
}

repairWomen();
