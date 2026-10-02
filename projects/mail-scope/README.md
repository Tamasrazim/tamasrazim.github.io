# MailScope

MailScope is a browser-first email intelligence surface for the Tamasrazim site.

## Scope

- Email normalization and syntax validation
- Domain extraction
- IDN/ASCII hostname normalization
- MX record inspection
- SPF TXT detection
- DMARC TXT detection
- DNSSEC DS-record signal
- Local-only scan history
- JSON report export

The static project deliberately does **not** enumerate private platform accounts or ship authenticated breach-service API keys to the browser.

## Data handling

The entered email stays in the browser until the page is closed or cleared. DNS lookups are sent to Google's public DNS-over-HTTPS endpoint only when a scan is run. Local history stores a masked email address and domain.

## Authenticated breach sources

A future server-side connector can integrate an authorized breach provider. Secrets should remain on that server; they must not be embedded in a GitHub Pages client.

## Route

https://tamasrazim.github.io/projects/mail-scope/
