# Firebase migration plan

## Current state
- React Native app backend logic has been routed through a Firebase-compatible adapter.
- Authentication, Firestore CRUD, and Storage uploads now use Firebase-backed helpers.
- Existing UI and service entry points remain intact.

## Files changed
- src/lib/firebase.js
- src/lib/firebaseAdapter.js
- src/lib/supabase.js
- src/services/authService.js
- src/services/inventoryService.js
- .env.example
- firebase.json
- firebase.rules
- storage.rules
- README.md

## Remaining production steps
1. Add real Firebase project credentials to the Expo environment variables.
2. Create the Firestore collections and Storage buckets in Firebase Console.
3. Deploy Firestore and Storage rules.
4. Import existing Supabase data into Firestore.
5. Re-test authentication, CRUD operations, uploads, and notifications after credentials are available.
