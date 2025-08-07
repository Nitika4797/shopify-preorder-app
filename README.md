# Shopify Pre-order App

A complete Shopify app for managing product pre-orders with serverless deployment support.

## Features

- **Product Pre-order Configuration**: Enable/disable pre-order for specific products or variants
- **Automated Button Replacement**: Automatically replaces "Add to Cart" with "Pre-order" button
- **Flexible Payment Options**: Support for full upfront payment, deposits, or payment upon fulfillment
- **Order Management**: Automatic tagging of pre-order items for easy identification
- **Theme Integration**: Seamless integration with any Shopify theme via Theme App Extensions
- **Webhook Support**: Real-time processing of orders and product updates
- **Serverless Architecture**: No server management required - deploy to Vercel, Netlify, or similar

## Project Structure

```
shopify-preorder-app/
├── backend/                 # Express.js API server
│   ├── models/             # MongoDB data models
│   ├── routes/             # API routes (auth, preorders, webhooks)
│   ├── package.json
│   └── index.js
├── frontend/               # React admin interface
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.js
│   └── package.json
├── theme-extension/        # Shopify Theme App Extension
│   ├── blocks/
│   │   └── preorder_button.liquid
│   └── shopify.extension.toml
├── docs/                   # Documentation
└── package.json           # Root package.json
```

## Technology Stack

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React, Shopify Polaris
- **Database**: MongoDB Atlas (free tier supported)
- **Deployment**: Vercel/Netlify (serverless)
- **Shopify Integration**: Admin API, Theme App Extensions, Webhooks

## Quick Start

### Prerequisites

1. Shopify Partner account
2. MongoDB Atlas account (free tier)
3. Node.js 16+ installed
4. Git

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. Configure your environment variables in the `.env` files

### Development

Run the development servers:
```bash
npm run dev
```

This will start both the backend API (port 3000) and frontend (port 3001).

### Deployment

See the deployment documentation in `docs/deployment-guide.md` for detailed instructions on deploying to various serverless platforms.

## Configuration

### Shopify App Setup

1. Create a new app in your Shopify Partner dashboard
2. Configure the app URL and redirect URLs
3. Set up the required scopes and permissions
4. Install the app on a development store for testing

### Database Setup

1. Create a MongoDB Atlas cluster (free tier available)
2. Get your connection string
3. Add it to your backend `.env` file

## Usage

1. Install the app on a Shopify store
2. Navigate to the app in the Shopify admin
3. Configure products for pre-order in the "Product Configuration" section
4. The theme app extension will automatically show pre-order buttons for configured products

## API Endpoints

- `GET /api/preorders/:shopId` - Get all pre-order configurations
- `POST /api/preorders/:shopId` - Create/update pre-order configuration
- `DELETE /api/preorders/:shopId/:productId/:variantId` - Delete configuration
- `POST /api/webhooks/orders/create` - Handle new orders
- `POST /api/webhooks/products/update` - Handle product updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please refer to the documentation in the `docs/` folder or create an issue in the repository.

