# Sales dashboard visual refresh

The opportunities sales dashboard now leads with one shared six-metric summary, followed by opportunity health and the existing funnel, target, trend and forecast charts. Supporting topic, meeting, team and activity reports remain available in a native, keyboard accessible “Detaylı satış raporları” disclosure. Opening it resizes the existing responsive charts correctly.

Headings use sentence case, larger type and shorter explanations. The period control spells out monthly/quarterly/yearly. Neutral cards, consistent spacing and mobile stacking reduce competing frames and colors. Existing drill-down cards now use native buttons for keyboard access. All styles are scoped to the sales dashboard inside the existing visual theme.

Validation: isolated release passes TypeScript and production build. The entire calculation, state and filter section is unchanged; all 33 existing JSX event handlers match the previous release. Local interactive previews used synthetic opportunities to check the filter drawer, drill-down, target dialog, disclosure charts, light/dark themes and a 390px mobile layout. No database writes were needed. Existing financial work is excluded from this release.
