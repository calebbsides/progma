Progma

Progma sits between the developer and their existing dev server as a transparent proxy. It injects a thin client SDK into every HTML response, which powers the overlay UI. All AI and annotation logic runs server-side; the client is kept as lightweight as possible.

**CRITICAL NOTE** All code changes should have a create update or delete workflow attached to them

**CRITICAL NOTE** Before creating a code commit a /code-review job should be submitted and an update should be made to the CHANGELOG outlining the changes that were made