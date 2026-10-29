import prodConfig from '../../firebase-applet-config.json';
import testConfig from '../../firebase-applet-config.test.json';

type AppFirebaseConfig = typeof testConfig & { measurementId?: string };

// Every site (test, dev, main) currently uses the same Firebase project (shalaby-crm-eg); the files stay separate so production can move to its own project later.
export const firebaseConfig: AppFirebaseConfig = import.meta.env.VITE_APP_ENV === 'test' ? testConfig : prodConfig;
