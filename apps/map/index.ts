import { registerRootComponent } from 'expo';

import App from './App';
import { registerServiceWorker } from './src/lib/swRegister';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Offline shell + tile cache (production web only; native is a no-op stub).
registerServiceWorker();
