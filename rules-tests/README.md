# Security rules tests

- `npm test`: the Firestore rules against the emulator (who can read and write what).
- `npm run e2e`: the real app against the emulators. Build it first:
  `VITE_FIREBASE_EMULATORS=1 npx vite build --outDir /tmp/emu-dist` (from the project root), then
  `APP_DIST=/tmp/emu-dist CHROME=/path/to/chromium npm run e2e`.

Needs Java (for the emulator) and `npm install` in this folder.
