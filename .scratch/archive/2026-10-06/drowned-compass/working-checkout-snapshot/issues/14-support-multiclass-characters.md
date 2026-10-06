# 14 — Support multiclass Player Characters

**What to build:** A player can add, edit, and remove additional class-and-level entries after initial setup, with total level, proficiency bonus, spell statistics, and Party summaries updating consistently.

**Blocked by:** 05 — Calculate and override Derived Values; 06 — Read the Party at a glance.

**Status:** ready-for-agent

- [ ] A Character Record supports one or more class-and-level entries while retaining a clear primary class.
- [ ] Total level derives from the class entries and updates proficiency-dependent values.
- [ ] The Party Dashboard presents a readable multiclass summary.
- [ ] Removing or changing a class cannot produce an invalid negative or zero-level Character Record.
- [ ] Multiclass changes save independently and synchronize across browsers.
