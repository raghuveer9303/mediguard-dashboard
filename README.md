<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MediGuard AI Dashboard

A comprehensive healthcare monitoring dashboard for patient vitals and risk predictions.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Deploy to GitHub Pages

This project is configured to deploy automatically to GitHub Pages using GitHub Actions.

### Automatic Deployment

1. Push your code to a GitHub repository
2. Go to your repository Settings → Pages
3. Under "Source", select "GitHub Actions"
4. The workflow will automatically build and deploy on every push to the main branch

### Manual Deployment

You can also deploy manually using:

```bash
npm install -D gh-pages
npm run deploy
```

**Note:** Make sure to update the `base` path in `vite.config.ts` to match your repository name (e.g., `/your-repo-name/`).

The site will be available at `https://<your-username>.github.io/<repository-name>/`
# MediGuard-dashboard
