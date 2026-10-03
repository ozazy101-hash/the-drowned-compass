# Module design

Build deep modules: a small interface that lets callers use substantial behavior without learning its implementation. A seam is where that interface lives. Before implementing a ticket, identify the module, its interface, and the invariants and error modes that callers must know.

- Define calculations, validation, state transitions, and conflict semantics in the feature's domain module. Expose a focused command and a result that reports the accepted state or conflict; enforce persistence and access invariants again in the database.
- Let `App.tsx` compose navigation and feature views. Keep each feature's draft handling and save feedback with its feature module. Storage mapping, authentication, and realtime delivery belong behind the existing `PartyData` seam, which has Supabase and in-memory adapters.
- Extend `PartyData` with cohesive operations that express user intent. Keep button-level steps and database row shapes inside modules and adapters. Introduce another seam only when real implementations vary across it.
- Test observable behavior through the module's interface: pure domain transitions, equivalent adapter outcomes, and a browser journey for the user-facing flow. Include a cross-feature journey when accepted records interact.

Before review, apply the deletion test: if removing the module would spread its rules across callers, it has useful depth. If a ticket adds several unrelated branches to `App.tsx`, many thin forwarding methods to `PartyData`, or repeats an invariant across adapters, revisit the interface and seam before integration.
