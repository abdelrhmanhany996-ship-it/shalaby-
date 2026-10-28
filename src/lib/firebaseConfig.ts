import prodConfig from '../../firebase-applet-config.json';
import testConfig from '../../firebase-applet-config.test.json';

type AppFirebaseConfig = typeof testConfig & { measurementId?: string };

// The test site builds with VITE_APP_ENV=test and talks to its own Firebase project; main and dev use the production config.
export const firebaseConfig: AppFirebaseConfig = import.meta.env.VITE_APP_ENV === 'test' ? testConfig : prodConfig;
