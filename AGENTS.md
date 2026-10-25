# Local development

Work in Prototype mode unless requested otherwise.

As part of implementation tasks, handle starting or restarting the local development server when needed. Check for an existing server first and avoid duplicates or stopping unrelated processes. Use port 8000 when available and leave the server running for the user.

Serve this static project with `python3 -m http.server 8000 --bind 127.0.0.1`. Use manual browser refresh; no automatic reload tooling is needed.

Do not commit or push unless explicitly requested.
