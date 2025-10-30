// src/services/advice.js
// Client-side example. Move the network call to a backend for production.
export async function getStyleAdviceFor(eventDescription) {
  // Replace this URL with your backend endpoint which proxies to the LLM.
  const BACKEND_URL = "/api/style-advice"; // <-- implement server route
  const payload = {
    prompt: `Given the event: "${eventDescription}", suggest 3-5 suitable dress or suit styles from a rental perspective for a dress rental business. Focus on popular categories like Suits, Blazers, Sherwani, Jodhpuri for men, and Bridal Gowns, Sangeet Gowns, Pre-Wedding Gowns, Maternity Gowns, Bridal Maternity Gowns for women. Provide short, concise suggestions.`
  };
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to fetch advice");
  const { text } = await res.json();
  return text || "No advice returned.";
}