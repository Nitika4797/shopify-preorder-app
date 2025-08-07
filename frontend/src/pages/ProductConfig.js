import React, { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Select,
  Button,
  Banner,
  DatePicker,
} from '@shopify/polaris';
import axios from 'axios';

function ProductConfig() {
  const [formData, setFormData] = useState({
    productId: '',
    variantId: '',
    isPreorderEnabled: false,
    preorderQuantityLimit: '',
    expectedShippingDate: null,
    customPreorderMessage: 'This item is available for pre-order!',
    paymentType: 'full_upfront',
    depositPercentage: '20',
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const shopDomain = new URLSearchParams(window.location.search).get('shop') || 'example.myshopify.com';

  const handleInputChange = (field) => (value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.productId) {
      setMessage({ type: 'critical', content: 'Product ID is required' });
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        preorderQuantityLimit: formData.preorderQuantityLimit ? parseInt(formData.preorderQuantityLimit) : null,
        depositPercentage: parseInt(formData.depositPercentage),
      };

      await axios.post(`/api/preorders/${shopDomain}`, payload);
      
      setMessage({ type: 'success', content: 'Pre-order configuration saved successfully!' });
      
      // Reset form
      setFormData({
        productId: '',
        variantId: '',
        isPreorderEnabled: false,
        preorderQuantityLimit: '',
        expectedShippingDate: null,
        customPreorderMessage: 'This item is available for pre-order!',
        paymentType: 'full_upfront',
        depositPercentage: '20',
      });
    } catch (error) {
      setMessage({ type: 'critical', content: 'Failed to save configuration' });
      console.error('Error saving config:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentTypeOptions = [
    { label: 'Full payment upfront', value: 'full_upfront' },
    { label: 'Deposit payment', value: 'deposit' },
    { label: 'Payment upon fulfillment', value: 'upon_fulfillment' },
  ];

  return (
    <Page
      title="Product Configuration"
      subtitle="Configure pre-order settings for your products"
      primaryAction={{
        content: 'Save Configuration',
        onAction: handleSubmit,
        loading: loading,
      }}
    >
      <Layout>
        {message && (
          <Layout.Section>
            <Banner
              status={message.type}
              title={message.type === 'success' ? 'Success' : 'Error'}
              onDismiss={() => setMessage(null)}
            >
              {message.content}
            </Banner>
          </Layout.Section>
        )}
        
        <Layout.Section>
          <Card sectioned>
            <FormLayout>
              <TextField
                label="Product ID"
                value={formData.productId}
                onChange={handleInputChange('productId')}
                placeholder="Enter Shopify product ID"
                helpText="You can find the product ID in your Shopify admin URL when viewing a product"
              />
              
              <TextField
                label="Variant ID (Optional)"
                value={formData.variantId}
                onChange={handleInputChange('variantId')}
                placeholder="Enter variant ID for specific variant"
                helpText="Leave empty to apply to all variants of the product"
              />
              
              <Checkbox
                label="Enable pre-order for this product"
                checked={formData.isPreorderEnabled}
                onChange={handleInputChange('isPreorderEnabled')}
              />
              
              {formData.isPreorderEnabled && (
                <>
                  <TextField
                    label="Pre-order quantity limit"
                    type="number"
                    value={formData.preorderQuantityLimit}
                    onChange={handleInputChange('preorderQuantityLimit')}
                    placeholder="Leave empty for no limit"
                    helpText="Maximum number of items that can be pre-ordered"
                  />
                  
                  <TextField
                    label="Custom pre-order message"
                    value={formData.customPreorderMessage}
                    onChange={handleInputChange('customPreorderMessage')}
                    multiline={3}
                    helpText="This message will be displayed to customers"
                  />
                  
                  <Select
                    label="Payment type"
                    options={paymentTypeOptions}
                    value={formData.paymentType}
                    onChange={handleInputChange('paymentType')}
                  />
                  
                  {formData.paymentType === 'deposit' && (
                    <TextField
                      label="Deposit percentage"
                      type="number"
                      value={formData.depositPercentage}
                      onChange={handleInputChange('depositPercentage')}
                      suffix="%"
                      helpText="Percentage of total price to collect as deposit"
                    />
                  )}
                </>
              )}
            </FormLayout>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default ProductConfig;

