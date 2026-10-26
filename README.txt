ANIME PLASMA — NETLIFY DEPLOYMENT

Project contents:
- index.html — website
- netlify/functions/news.mjs — server-side RSS fetch from Anime News Network, Crunchyroll News, and MyAnimeList
- netlify/functions/engagement.mjs — shared likes/comments using Netlify Blobs
- netlify.toml and package.json — Netlify build configuration

IMPORTANT:
A static upload of only index.html will not deploy server functions. Recommended deployment: upload this folder to a GitHub repository, then in Netlify choose Add new site > Import an existing project, select the repository, and deploy. Netlify installs @netlify/blobs and deploys the functions.
No RSS API key is required. Feed and thumbnail availability depend on publishers. The site shows headlines, excerpts, available thumbnails and original links rather than copying full articles.
Likes/comments are anonymous and shared via Netlify Blobs, but this demo has no login, moderation, or robust anti-spam protection.
