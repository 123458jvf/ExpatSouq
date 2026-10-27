// Seed the ExpatSouq admin role in Firestore.
//
// Admin access is now decided by a Firestore document, not a hardcoded UID.
// A user is an admin when a document exists at:
//   admins/{uid}  with  { role: "admin" }
// or
//   users/{uid}   with  { role: "admin" }
//
// This script uses the Firebase Admin SDK with a service account, so it can
// run outside the browser and write the role before anyone logs in.
//
// Usage:
//   1. Download a service account key for the project
//      Firebase Console -> Project settings -> Service accounts ->
//      "Generate new private key" -> save as service-account.json
//   2. npm install firebase-admin
//   3. node scripts/seed-admin.mjs <uid> [path-to-service-account.json]
//
// Without a service account argument, the script prints the quick browser
// console alternative instead.

import { readFileSync } from "node:fs";

const uid = process.argv[2];
const saPath = process.argv[3] ?? "service-account.json";

if (!uid) {
  console.log(
    [
      "No UID provided.",
      "Browser console alternative (run while logged in as the admin account in this browser):",
      "",
      "  import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';",
      "  import { getFirestore, setDoc, doc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';",
      "  const app = getApps().length ? getApp() : initializeApp({ /* your firebaseConfig */ });",
      "  const db = getFirestore(app);",
      "  await setDoc(doc(db, 'admins', firebase.auth().currentUser.uid), { role: 'admin' });",
      "  await setDoc(doc(db, 'users', firebase.auth().currentUser.uid), { role: 'admin', email: firebase.auth().currentUser.email }, { merge: true });",
      "  console.log('Admin role seeded for', firebase.auth().currentUser.uid);",
      "",
    ].join("\n")
  );
  process.exit(0);
}

const admin = await import("firebase-admin");

const serviceAccount = JSON.parse(readFileSync(saPath, "utf8"));

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const roleDoc = { role: "admin", updatedAt: admin.firestore.FieldValue.serverTimestamp() };

await db.collection("admins").doc(uid).set(roleDoc, { merge: true });
await db.collection("users").doc(uid).set({ ...roleDoc, email: (await admin.auth().getUser(uid)).email ?? null }, { merge: true });

console.log("Admin role seeded for UID:", uid);