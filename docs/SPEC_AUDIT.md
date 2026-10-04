# Specification Audit - TrackUG

## Contradictions and Issues
- **WebSocket Auth:** Specification section 9 suggests passing the access token in the URL query string. This is a security risk as URLs are often logged.
    - *Proposed Fix:* Authenticate with the first WebSocket message (e.g., a "subscribe" or "auth" message) or a short-lived ticket-based mechanism.
- **Plate Normalisation:** Look-alike repair rules (p5) are position-dependent. Need to confirm if plate formats/positions are consistent.
- **VERIFY Items:**
    - GT06 packet byte layout (p5): Needs verification against actual hardware datasheet.
    - ANPR accuracy (p5): Needs real-world testing.
    - SMS Provider terms and sender ID rules (p2): Need to be checked once provider is selected.
    - Official Ugandan plate formats (p6): Need to be confirmed to ensure grammar rules in normaliser are accurate.

## Security Weaknesses
- **Token handling:** JWT in cookie is standard, but the WebSocket URL auth (mentioned above) is insecure.
- **Physical Access:** Camera ANPR edge node needs to be physically secured.
