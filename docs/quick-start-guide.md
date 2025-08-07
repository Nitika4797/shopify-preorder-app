# Quick Start Guide - Shopify Pre-order App

This guide will help you quickly deploy and configure your Shopify pre-order app. Follow these steps to get your app running in production.

## Prerequisites Checklist

Before you begin, ensure you have:
- [ ] Shopify Partner account
- [ ] MongoDB Atlas account (free tier is sufficient)
- [ ] Vercel or Netlify account
- [ ] Git repository with the app code

## Step 1: Database Setup (5 minutes)

1. **Create MongoDB Atlas Cluster:**
   - Go to [MongoDB Atlas](https://mongodb.com/cloud/atlas)
   - Create a new cluster (choose the free M0 tier)
   - Wait for cluster creation (7-10 minutes)

2. **Configure Database Access:**
   - Add a database user with read/write permissions
   - Set network access to "Allow access from anywhere" (0.0.0.0/0)
   - Get your connection string from the "Connect" button

## Step 2: Shopify App Configuration (10 minutes)

1. **Create Shopify App:**
   - Go to your Shopify Partner Dashboard
   - Click "Create app" → "Custom app"
   - Enter app name (e.g., "Pre-order Manager")
   - Save the API key and API secret

2. **Configure App Settings:**
   - Set App URL to your deployment URL (you'll update this after deployment)
   - Add redirect URLs for OAuth
   - Set required scopes: `read_products,write_products,read_orders,write_orders`

## Step 3: Deploy to Vercel (15 minutes)

1. **Connect Repository:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings:**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`

3. **Set Environment Variables:**
   ```
   SHOPIFY_API_KEY=your_api_key_here
   SHOPIFY_API_SECRET=your_api_secret_here
   SHOPIFY_SCOPES=read_products,write_products,read_orders,write_orders
   SHOPIFY_APP_URL=https://your-app-domain.vercel.app
   MONGODB_URI=your_mongodb_connection_string
   REACT_APP_SHOPIFY_API_KEY=your_api_key_here
   REACT_APP_API_URL=https://your-app-domain.vercel.app
   ```

4. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Note your app URL

## Step 4: Update Shopify App URLs (2 minutes)

1. Return to your Shopify Partner Dashboard
2. Update your app's URLs to use your Vercel deployment URL
3. Save the changes

## Step 5: Test Installation (5 minutes)

1. **Install on Development Store:**
   - Go to your app in Partner Dashboard
   - Click "Test your app"
   - Install on a development store

2. **Verify Functionality:**
   - Access the app from Shopify admin
   - Configure a product for pre-order
   - Check that the pre-order button appears on the storefront

## Alternative: Deploy to Netlify

If you prefer Netlify over Vercel:

1. **Connect Repository:**
   - Go to [Netlify Dashboard](https://netlify.com)
   - Click "New site from Git"
   - Connect your repository

2. **Configure Build:**
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/build`

3. **Set Environment Variables:**
   - Use the same variables as listed for Vercel
   - Add them in Site Settings → Environment Variables

## Troubleshooting

**Common Issues:**

- **Build fails:** Check that all dependencies are listed in package.json
- **App won't load:** Verify environment variables are set correctly
- **Database connection fails:** Check MongoDB Atlas network access settings
- **OAuth errors:** Ensure redirect URLs match exactly in Shopify app settings

**Getting Help:**

- Check the full deployment guide in `docs/deployment-guide.md`
- Review error logs in your deployment platform
- Verify all environment variables are set correctly

## Next Steps

After successful deployment:

1. **Configure Custom Domain** (optional)
2. **Set up monitoring and alerts**
3. **Test with real products and orders**
4. **Distribute to clients**

Your Shopify pre-order app is now ready for production use!

