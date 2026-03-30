# BrawlT Roadmap

## NOW — Current Version

| # | Feature | Status | Description |
|---|---------|--------|-------------|
| 1 | JoinScreen → Home Hub | done | Transform bare code-input into a hub: active tournaments list, history button, join-with-code, Coming Soon placeholders for Find/Create |
| 2 | Multiple Active Tournaments | done | Support switching between multiple active tournaments (currently only shows the first) |
| 3 | Tournament Feed / Timeline | done | Per-tournament feed with text + image posts. Auto-post check-ins. New BottomNav tab. Admin censoring |

---

## BETA — Next Version (behind feature flags)

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 4 | Region-based Discovery | P1 | Admins tag a curated region on tournament creation. Players search/filter by region. No map, just search. Only launch once 3-5 active admins exist |
| 5 | BT Currency System | P1 | Internal economy: buy BT credits, spend to create tournaments, winners earn BT. Immutable ledger. 50% to winner, 50% to platform |
| 6 | Paid Admin (Create Your Own) | P2 | `can_create_tournaments` flag on profiles. Gated behind BT balance. Same admin UI, filtered to own tournaments. Show value prop + waitlist before payments are live |
| 7 | Prize Acknowledgment | P2 | Tournament card shows BT prize on join. Player confirms acknowledgment before joining |
| 8 | Regional Feed | P3 | Prestige feature: admins from region + tournament winners can post 1 message/day to a public regional feed. Depends on regions being established |
| 9 | Tutorial / Onboarding | P2 | First-time tutorial screens walking new users through the app (join, check-in, feed, leaderboard). Help icon in UI to re-launch tutorial or submit an error report to admin |
| 10 | In-app Tournament Invites | P2 | Invite users to a tournament directly within the app (not just sharing a code externally) |
| 11 | Join by Location & Association | P2 | Request to join tournaments by location or group/club association. Ties into region-based discovery |

---

## Ideas & Notes

- **Free BT for new users**: Give every new user 1 BT so they can try creating a tournament without paying
- **BT pricing**: Admin spends N BT to create tournament → prize = N/2 BT, platform keeps N/2. Clean 50% split
- **Region list**: Use curated list (not freetext) to prevent fragmentation ("tel-aviv" vs "Tel Aviv" vs "TLV")
- **Regional feed as reward**: Winners posting to the regional feed is a status signal, not a content feature. Only works with enough active players per region
- **Beta management**: Feature flags on main branch, not separate environments. `feature_flags` table + `useFeatureFlags()` hook. Optional staging Supabase project for migration testing
- **Feed v1 simplicity**: No likes, no comments, no threads. Flat chronological feed. Social features layered later
- **Auto-post check-ins**: When a player checks in, auto-create a feed post with trophy info. Keeps feed alive even without manual posts
