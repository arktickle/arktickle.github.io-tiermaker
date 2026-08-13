# xAI communication worker

This Worker keeps the xAI key out of the public GitHub Pages source.

## Deploy

1. Revoke the key that appeared in the screenshot and create a new xAI API key.
2. Install dependencies with `npm install` in this directory.
3. Sign in with `npx wrangler login`.
4. Store the new key with `npx wrangler secret put XAI_API_KEY`.
5. Deploy with `npm run deploy`.
6. Put the returned Worker URL in the root `xai-config.js` file:

```js
window.XAI_CHAT_ENDPOINT = "https://arknights-tk-xai-chat.YOUR-SUBDOMAIN.workers.dev";
```

Never place the API key in `xai-config.js`, HTML, JavaScript, Git, or GitHub repository secrets used by browser code. Configure an xAI spending limit and Cloudflare rate limiting before making a public endpoint widely available.
