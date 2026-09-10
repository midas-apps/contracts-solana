# Regression Cases

Run whenever prompt workflow, rule knowledge, or report format changes.

## One-shot full run

```bash
/exvul_solana_auditor
```

## Validate outputs

- `<repo>/exvul_solana_auditor.md` exists
- `<repo>/.exvul_solana_auditor/checklist.plan.min.json` exists
- If debug mode is enabled: `<repo>/.exvul_solana_auditor/` may contain `*.full.json` artifacts.

## Quality checks

- Bootstrap always prints the ASCII banner first, then `exvul_solana_auditor`.
- Checklist plan (`checklist.plan.min.json`) is created before candidate generation.
- Every in-scope file is analyzed via sink-first deep sweep (function-level preferred).
- Report starts with `# Smart Contract Vulnerability Audit — <Project Name>`.
- Report includes `## Executive Snapshot`.
- Each finding block includes impact, attack path, evidence, fix, and confidence.
- Findings are separated by `---`.
- Report includes `## Severity Summary` table.
- Report includes `## Checklist Summary`, `## Triage`, and `## Prioritized Remediation`.
- Missing checklist file does not crash run.
- `false_positive` findings are removed from final report.
- `valid_downgraded` findings include severity transition and explanation.
