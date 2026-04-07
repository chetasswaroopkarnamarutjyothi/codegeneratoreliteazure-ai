## CodeNova AI — Functional Requirements V3 Implementation Plan

### Phase 1: Quick UI & Existing Feature Enhancements
1. **#10 UI Customization** — Active section highlighted, inactive sections dark/black, dark theme adaptive contrast
2. **#14 User Identity** — Allow username changes from Profile, UID remains constant (already supported, verify)
3. **#1 Admin Set Credits Email** — ✅ Already done

### Phase 2: New Tools & Verifier
4. **#12 CodeNova Website Verifier** — New tool: input URL → AI-generated improvement suggestions using Lovable AI model
5. **#3 Marketing AI** — Ensure output is fully generated video, not just prompts/scripts

### Phase 3: App Generator Overhaul (#2)
6. **Auto-generate without manual HTML/CSS selection** — AI decides the tech stack
7. **Live preview environment** — Render generated app in iframe/sandbox
8. **Auto-create and store app in Projects** — Save generated apps to user's Projects
9. **Custom domain per project** — `<name>.stackmind.lovable.app` format (UI + validation for uniqueness)

### Phase 4: Enterprise Features (#4)
10. **Enterprise name capture in Payment** — Add enterprise name field to payment flow
11. **Enterprise Chat** — Rename "Company Chat" dynamically to enterprise name
12. **Enterprise Credits** — 2,000 credits/month per enterprise user, system-managed

### Phase 5: Subscription & Publishing Access (#8, #9)
13. **Banking/Payment details request flow** — User requests → Admin Request Box → Admin responds
14. **Publishing access control** — Only Pro, Pro+, Enterprise can publish; others blocked
15. **Domain format** — `<custom-name>.stackmind.lovable.app`

### Phase 6: Project-Based Editing (#11)
16. **Access apps via Projects** — Open and edit previously generated apps
17. **Submit changes → AI applies updates** — Dynamic AI-powered editing flow

### Phase 7: GitHub Integration (#13)
18. **GitHub account linking** — OAuth flow (Note: GitHub OAuth not natively supported in Lovable Cloud, will build UI + guidance)
19. **Push & Commit** — Push project code to linked GitHub repo

### Phase 8: Account Restore (#15)
20. **Account restore mechanism** — Admin-mediated recovery: user emails admin → admin restores → provides temp credentials → user changes password
