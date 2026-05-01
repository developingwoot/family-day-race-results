const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.claimRace = onCall({ cors: true }, async (request) => {
  const { raceId, driverGuid, playerName, site } = request.data;

  if (!raceId || !driverGuid || !playerName || !site) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();

  // Prevent duplicate claims for the same driver in the same race
  const existing = await db.collection("claimed-races")
    .where("raceId", "==", raceId)
    .where("driverGuid", "==", driverGuid)
    .get();

  if (!existing.empty) {
    throw new HttpsError("already-exists", "This race time has already been claimed.");
  }

  const newRef = db.collection("claimed-races").doc();
  await newRef.set({
    id: newRef.id,
    raceId,
    driverGuid,
    playerName,
    playerEmail: null,
    site,
    claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    qualifying: true,
    tournamentId: null,
  });

  return { id: newRef.id };
});
