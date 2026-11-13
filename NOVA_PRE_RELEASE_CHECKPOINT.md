# Nova Tutoring — pre-App-Store recovery checkpoint (2026-11-13)

**Purpose:** preserve complete source snapshots of the current development work before beginning the next release cycle. This is a safety checkpoint, **not** a merged or release-ready app. No production deployment is implied.

The root tree is the release baseline at commit `e95e52653ea704a8cace04684549177bc0c7f7d7`.

Complete source snapshots included under `.nova-snapshots/` (Git tree references, not partial diffs):

| Snapshot directory | Source branch | Commit |
|---|---|---|
| `arg-act1-latest` | `fix/archive-notebook-next-beat` | `0a2b3020bb45447a060a55954ef8f5d6c6156c16` |
| `island-web-3d` | `fix/island-webgl-fallback` | `2677cb147e0c1aae8871b52b5ece0726526bf70f` |
| `collector-app` | `codex/collector-production-app` | `cd1c0bb727af387a724fd857e6b764ff6ab994ce` |
| `nora-lantern-3d-experimental` | `feature/noras-last-lantern-3d` | `53f9293930a1e97fb65ec3f134869c883ffe2f0f` |

Each directory retains its source branch's complete file tree at that exact commit. To develop, use the actual source branches and review diffs; **do not treat the snapshot directories as merged application code**. The collector reward remains disabled pending approval and QA. The island, ARG, and collector changes need conflict resolution, regression testing, and native-device verification before release.

Vercel/Supabase environment values are not copied into this Git commit; they stay in the corresponding hosting services. Never commit private access credentials or unreleased physical collector QR material.
