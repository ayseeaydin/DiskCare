# DiskCare Telemetry & Analytics

## Privacy-first local analytics

DiskCare stores analytics locally only. Nothing is sent off the machine.

### Example local analytics (stats)

```json
{
  "totalRuns": 50,
  "mostCleanedTarget": "npm-cache",
  "averageFreedSpace": "2.3 GB",
  "failureRate": 0.02
}
```

## How to view stats

- If/when implemented, users can run `diskcare stats` to see summary data.
- All data is local, privacy-safe, and can inform product decisions.

## Product roadmap feedback

- Aggregated stats (most cleaned target, average freed space, error rate) help guide product decisions.
- No personal data is collected or shared.

---

See docs/architecture.md and docs/safety-model.md for more details.
