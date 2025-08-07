import React, { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  EmptyState,
  Spinner,
  Banner,
} from '@shopify/polaris';
import axios from 'axios';

function Dashboard() {
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const shopDomain = new URLSearchParams(window.location.search).get('shop') || 'example.myshopify.com';

  useEffect(() => {
    fetchPreorders();
  }, []);

  const fetchPreorders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/preorders/${shopDomain}`);
      setPreorders(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch pre-order configurations');
      console.error('Error fetching preorders:', err);
    } finally {
      setLoading(false);
    }
  };

  const rows = preorders.map((preorder) => [
    preorder.productId,
    preorder.variantId || 'All variants',
    <Badge status={preorder.isPreorderEnabled ? 'success' : 'critical'}>
      {preorder.isPreorderEnabled ? 'Enabled' : 'Disabled'}
    </Badge>,
    preorder.preorderQuantityLimit || 'No limit',
    preorder.expectedShippingDate 
      ? new Date(preorder.expectedShippingDate).toLocaleDateString()
      : 'Not set',
    preorder.paymentType,
  ]);

  const emptyStateMarkup = (
    <EmptyState
      heading="No pre-orders configured"
      action={{
        content: 'Configure products',
        url: '/products',
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Start by configuring which products should be available for pre-order.</p>
    </EmptyState>
  );

  if (loading) {
    return (
      <Page title="Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner size="large" />
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Pre-order Dashboard"
      subtitle="Overview of your pre-order configurations"
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner status="critical" title="Error">
              {error}
            </Banner>
          </Layout.Section>
        )}
        
        <Layout.Section>
          <Card>
            {preorders.length === 0 ? (
              emptyStateMarkup
            ) : (
              <DataTable
                columnContentTypes={[
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                ]}
                headings={[
                  'Product ID',
                  'Variant',
                  'Status',
                  'Quantity Limit',
                  'Expected Shipping',
                  'Payment Type',
                ]}
                rows={rows}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default Dashboard;

