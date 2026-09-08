/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar } from 'react-native';
import { AppProviders } from './src/app/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';

function App() {
  return (
    <AppProviders>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <RootNavigator />
    </AppProviders>
  );
}

export default App;
