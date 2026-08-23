[AI-generated response.]

Question: "Does it trigger whenever I push the database?"

Answer: Not immediately. The site loads `moistdb.sqlite` from the repository via the jsDelivr CDN, which caches branch content for up to approximately 12 hours. A push therefore propagates eventually, but not on push.

The following GitHub Action removes this delay. On each push that modifies the database, it instructs jsDelivr to purge its cached copy, causing the site to serve the updated database within seconds (applied on the next page load). No credentials or dependencies are required.

Setup:

1. In the `moistdb` repository, select Add file → Create new file.

2. Set the file path to exactly:
```
.github/workflows/purge-jsdelivr.yml
```
(The forward slashes create the required directories.)

3. Insert the following contents:
```yaml
name: Purge jsDelivr cache

on:
  push:
    branches: [main]
    paths:
      - moistdb.sqlite

jobs:
  purge:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh the CDN copy of the database
        run: curl -sfS "https://purge.jsdelivr.net/gh/yulefuel-moist/moistdb@main/moistdb.sqlite"
```

4. Commit the file.

The action is now active. Every push that modifies `moistdb.sqlite` will refresh the CDN automatically.

Notes:
- The `paths` filter restricts execution to commits that change the database file.
- Execution history is available under the repository's Actions tab.
- Updates apply on page load. Clients with the page already open must reload (Ctrl/Cmd+Shift+R).
- To verify the active source, open the site and view the browser console (F12): it logs `[Moist] database source: remote → …`.
