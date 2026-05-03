Start the Notly development server and open it in the browser.

Try these options in order (use whichever works):

```bash
# Option 1 — npx (Node.js, no install needed)
npx serve . -l 8000

# Option 2 — Python (Windows — confirmed available)
python -m http.server 8000

# Option 3 — Python 3
python3 -m http.server 8000
```

The app will be available at http://localhost:8000.

After starting, tell the user to open http://localhost:8000. Remind them that PWA service worker features require HTTPS in production (GitHub Pages, Netlify, etc.) but work on localhost for development.
