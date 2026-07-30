# Coach UX phases — unit and integration test scenarios

Covers Phases 1–6 from the coach UX plan. **Phases 1–4** are implemented in this release; **5–6** are deferred but scenarios are defined for future work.

---

## Phase 1 — Collapsible Coach Note panel

### Unit

| ID | Scenario | Expected |
|----|----------|----------|
| P1-U01 | `formatBroadcastPanelStatus(active, expiresAt)` when active + future expiry | Returns "Active · expires …" badge text |
| P1-U02 | When note expired | Status shows republish hint, no active badge |
| P1-U03 | `validateBroadcastPublish(body, audioUrl, videoUrl)` with text only | Valid |
| P1-U04 | Audio-only publish | Valid |
| P1-U05 | Empty publish (active=true) | Error: at least one of text/audio/video |

### Integration / E2E

| ID | Scenario | Expected |
|----|----------|----------|
| P1-I01 | Load Command Center | Coach note panel collapsed by default |
| P1-I02 | Click chevron | Editor expands (textarea, audio, video, expiry) |
| P1-I03 | Active broadcast while collapsed | Header shows active badge + expiry |
| P1-I04 | Publish text note | Member dashboard shows note card |
| P1-I05 | Publish text + audio URL | Member card shows text and `<audio>` |

---

## Phase 2 — Voice/audio uploads

### Unit

| ID | Scenario | Expected |
|----|----------|----------|
| P2-U01 | `buildCoachMediaStoragePath(scope, ext)` voice-notes member | `voice-notes/{id}/…` |
| P2-U02 | `buildCoachMediaStoragePath` broadcasts scope | `broadcasts/{tenantId}/…` |
| P2-U03 | `isAllowedCoachMediaScope(scope)` invalid path | false |
| P2-U04 | Audio blob > 5 MB | Throws size error |
| P2-U05 | `bufferToDataUrl` when Admin SDK unavailable | Returns data: URL |
| P2-U06 | Server upload with valid coach auth + scope | 200 + url field |

### Integration

| ID | Scenario | Expected |
|----|----------|----------|
| P2-I01 | Dev persona attaches voice note (no Firebase client auth) | POST `/api/coach/media-upload` succeeds |
| P2-I02 | Broadcast publish with attached audio | `audioUrl` persisted; member GET dashboard includes it |
| P2-I03 | Check-in voice feedback attach | PATCH check-in stores `coachVoiceNoteUrl` |
| P2-I04 | Plan delivery voice note | POST delivery includes voice URL |
| P2-I05 | Upload audio file (.webm) via file picker | Same as record attach flow |
| P2-I06 | Invalid scope on media-upload | 400 |

### E2E (manual / Playwright)

| ID | Scenario | Expected |
|----|----------|----------|
| P2-E01 | TC-UXP3-005 broadcast audio on member dashboard | Audio player visible and playable |

---

## Phase 3 — Plan template management

### Unit

| ID | Scenario | Expected |
|----|----------|----------|
| P3-U01 | `isBuiltInTemplateType(type)` | true for training_gym, training_home, nutrition_program |
| P3-U02 | `canDeleteTemplate(type)` | false for built-ins; true for plan_bundle |
| P3-U03 | `filterActiveTemplates(rows)` | Excludes rows with archivedAt set |
| P3-U04 | `summarizeTemplateStructure(bundle)` | Returns training days count, macro ranges, block slugs |
| P3-U05 | Bulk archive ids | Sets archivedAt on matching tenant rows only |

### Integration

| ID | Scenario | Expected |
|----|----------|----------|
| P3-I01 | GET `/api/plan-templates?includeArchived=1` | Returns archived templates |
| P3-I02 | GET default list for apply dropdown | Excludes archived |
| P3-I03 | GET `/api/plan-templates/[id]` | Full structure + tags |
| P3-I04 | PATCH metadata (name, tags) | 200, updatedAt changes |
| P3-I05 | POST `/api/plan-templates/bulk` archive | archivedAt set |
| P3-I06 | POST bulk restore | archivedAt cleared |
| P3-I07 | POST bulk delete plan_bundle | Removed; built-in ids rejected |
| P3-I08 | DELETE built-in template | 403 or skipped in bulk |
| P3-I09 | POST duplicate template | New plan_bundle with new key |
| P3-I10 | Apply template from training builder | Archived template not in dropdown |

### E2E

| ID | Scenario | Expected |
|----|----------|----------|
| P3-E01 | Click custom bundle row | Navigates to detail page |
| P3-E02 | Bulk select + archive | Rows move to Archived tab |
| P3-E03 | Detail page structure preview | Shows macros, block titles, training days |

---

## Phase 4 — Nutrition discoverability

### Unit

| ID | Scenario | Expected |
|----|----------|----------|
| P4-U01 | `contentBlockCategoryGroup(category)` | Maps nutrition_tips → nutrition |
| P4-U02 | Filter blocks by nutrition group | Only nutrition categories returned |
| P4-U03 | `listNutritionTemplates(templates)` | nutrition_program + bundles with hasNutrition |

### Integration

| ID | Scenario | Expected |
|----|----------|----------|
| P4-I01 | Plan templates page | "Nutrition templates" section visible |
| P4-I02 | Content blocks page | Category filter chips work |
| P4-I03 | Template detail | Nutrition block slugs resolve to titles via content-blocks API |
| P4-I04 | Nutrition builder | Helper link to `/coach/content-blocks` present |

---

## Phase 5 — Built-in template structure review (deferred)

| ID | Scenario | Expected |
|----|----------|----------|
| P5-U01 | Seed refresh updates built-in structure without touching plan_bundle | Only training_gym/home/nutrition_program rows updated |
| P5-I01 | Duplicate built-in to custom | New editable plan_bundle |
| P5-I02 | Tenant-neutral naming | Built-in names contain no member-specific labels |

---

## Phase 6 — Exercise video library (deferred)

| ID | Scenario | Expected |
|----|----------|----------|
| P6-U01 | `preferOwnedExercise(catalog, id)` same name | Returns owned row id |
| P6-U02 | No duplicate name | Returns original id |
| P6-U03 | Category CRUD per tenant | Categories isolated by tenantId |
| P6-I01 | Apply template with third-party slug + owned duplicate name | Plan uses owned exercise id |
| P6-I02 | Catalog import with video_source column | Rows classified correctly |
| P6-I03 | Filter exercises by category | Only matching category returned |
