---
status: accepted
---

# Use GitHub Pages with Supabase

The campaign companion will use GitHub Pages for its static frontend and Supabase for authentication, shared campaign data, realtime updates, and later character-artwork storage. A browser-only site would be simpler but could not synchronize edits safely across players, while a custom backend would add unnecessary hosting and maintenance for a single six-character campaign; Supabase supplies the required backend services while preserving the inexpensive GitHub Pages deployment.
