import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Frame, Navigation, TopBar } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import Dashboard from './pages/Dashboard';
import ProductConfig from './pages/ProductConfig';

function App() {
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const [userMenuActive, setUserMenuActive] = useState(false);

  const toggleMobileNavigationActive = () =>
    setMobileNavigationActive(!mobileNavigationActive);

  const toggleUserMenuActive = () =>
    setUserMenuActive(!userMenuActive);

  const navigationMarkup = (
    <Navigation location="/">
      <Navigation.Section
        items={[
          {
            url: '/',
            label: 'Dashboard',
            icon: 'HomeMinor',
          },
          {
            url: '/products',
            label: 'Product Configuration',
            icon: 'ProductsMinor',
          },
        ]}
      />
    </Navigation>
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      userMenu={
        <TopBar.UserMenu
          actions={[
            {
              items: [{ content: 'Settings', icon: 'SettingsMinor' }],
            },
          ]}
          name="Pre-order Manager"
          detail="Shopify App"
          initials="PM"
          open={userMenuActive}
          onToggle={toggleUserMenuActive}
        />
      }
      onNavigationToggle={toggleMobileNavigationActive}
    />
  );

  // Get shop domain from URL parameters or App Bridge
  const shopOrigin = new URLSearchParams(window.location.search).get('shop') || 'example.myshopify.com';

  const appBridgeConfig = {
    apiKey: process.env.REACT_APP_SHOPIFY_API_KEY || 'your_api_key_here',
    shopOrigin: shopOrigin,
    forceRedirect: true,
  };

  return (
    <AppBridgeProvider config={appBridgeConfig}>
      <Router>
        <Frame
          topBar={topBarMarkup}
          navigation={navigationMarkup}
          showMobileNavigation={mobileNavigationActive}
          onNavigationDismiss={toggleMobileNavigationActive}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductConfig />} />
          </Routes>
        </Frame>
      </Router>
    </AppBridgeProvider>
  );
}

export default App;

