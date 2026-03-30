# Future Display-Screen Mode Notes

- Use the existing summary-card model as the display-screen payload so wallboards do not depend on raw tables.
- Add an auto-rotating read-only route backed by saved report templates marked `isPinned`.
- Keep the display layout server-rendered and cacheable, with a client refresh interval only for lightweight polling.
- Prefer high-contrast cards, larger numeric typography, and no editable controls in display mode.
- For shop-floor displays, add a "current shift" preset tied to business-date logic instead of browser-local dates.
