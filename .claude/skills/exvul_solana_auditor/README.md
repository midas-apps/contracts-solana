# exvul-solana-skill

> Prompt-native Solana security audit skill for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).
> One command in, one report out.

```text
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║               ███████╗██╗  ██╗██╗   ██╗██╗   ██╗██╗                       ║
║               ██╔════╝╚██╗██╔╝██║   ██║██║   ██║██║                       ║
║               █████╗   ╚███╔╝ ██║   ██║██║   ██║██║                       ║
║               ██╔══╝   ██╔██╗ ╚██╗ ██╔╝██║   ██║██║                       ║
║               ███████╗██╔╝ ██╗ ╚████╔╝ ╚██████╔╝███████╗                  ║
║               ╚══════╝╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ╚══════╝                  ║
║                                                                           ║
║           ███████╗ ██████╗ ██╗      █████╗ ██╗   ██╗ █████╗               ║
║           ██╔════╝██╔═══██╗██║     ██╔══██╗████╗ ██║██╔══██╗              ║
║           ███████╗██║   ██║██║     ███████║██╔██╗██║███████║              ║
║           ╚════██║██║   ██║██║     ██╔══██║██║╚████║██╔══██║              ║
║           ███████║╚██████╔╝███████╗██║  ██║██║ ╚███║██║  ██║              ║
║           ╚══════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚══╝╚═╝  ╚═╝              ║
║                                                                           ║
║                   ███████╗██╗  ██╗██╗██╗     ██╗                          ║
║                   ██╔════╝██║ ██╔╝██║██║     ██║                          ║
║                   ███████╗█████╔╝ ██║██║     ██║                          ║
║                   ╚════██║██╔═██╗ ██║██║     ██║                          ║
║                   ███████║██║  ██╗██║███████╗███████╗                     ║
║                   ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## What Is This?

**exvul-solana-skill** is a prompt-only [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) that performs autonomous end-to-end security audits on Solana smart-contract repositories. No scripts, no external tools — just prompt orchestration driving a seven-stage audit pipeline.

### Key Features

- **Fully autonomous** — scans every in-scope file, generates findings, and writes a final report with zero human intervention.
- **Adversarial verification** — each candidate finding goes through an isolated adversarial pass that starts with the assumption "likely false positive," dramatically reducing noise.
- **Solana-specific rulepack** — built-in rules covering missing signer checks, unverified token account owners, attacker-controlled CPI targets, duplicate mutable account aliases, and more.
- **Severity policy & confidence scoring** — findings are classified Critical → Informational with `high-confidence` / `needs-manual-review` labels.
- **Structured checklist** — maps findings to a categorized checklist (15 categories) for comprehensive coverage tracking.

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and authenticated.

## Installation

Clone this repo into your Claude Code skills directory:

```bash
git clone https://github.com/exvulsec/exvul-solana-skill.git ~/.claude/skills/exvul_solana_auditor
```

## Usage

Navigate to the Solana repository you want to audit and invoke the skill:

```bash
cd <target-repo>
claude
/exvul_solana_auditor
```

### Output

| File                        | Description                             |
| --------------------------- | --------------------------------------- |
| `./exvul_solana_auditor.md` | Final audit report                      |
| `./.exvul_solana_auditor/`  | Intermediate debug artifacts (optional) |

The final report includes:

- Total findings count
- Severity distribution (Critical / High / Medium / Low / Informational)
- Confidence breakdown (`high-confidence` vs `needs-manual-review`)
- Triage summary (`valid`, `valid_downgraded`, `false_positive_dropped`)

## How It Works

The skill executes seven stages in sequence, each driven by a dedicated prompt template:

| Stage | Prompt                       | Purpose                                           |
| ----- | ---------------------------- | ------------------------------------------------- |
| S00   | `00_bootstrap.md`            | Initialize runtime, print banner                  |
| S05   | `05_checklist_plan.md`       | Parse checklist & build a lite audit plan         |
| S10   | `10_scope_and_evidence.md`   | Identify in-scope files & extract evidence        |
| S15   | `15_deep_file_sweep.md`      | Sink-first, function-level deep analysis          |
| S20   | `20_candidate_generation.md` | Generate candidate findings from rulepack + sweep |
| S30   | `30_adversarial_verifier.md` | Isolate & verify each finding adversarially       |
| S50   | `50_report_writer.md`        | Compute checklist results & publish report        |

## Project Structure

```
├── SKILL.md                  # Skill manifest (entry point for Claude Code)
├── prompts/                  # Stage prompt templates (S00–S50)
├── knowledge/
│   ├── rulepack.md           # Solana-specific security rules
│   ├── severity_policy.md    # Severity scale & confidence thresholds
│   ├── checklist_router.md   # Checklist routing logic
│   └── checklists/           # Categorized audit checklists (CAT-I–XV)
├── references/
│   ├── workflow.md           # End-to-end workflow reference
│   ├── progress_protocol.md  # Runtime visualization protocol
│   ├── output_budget.md      # Per-stage output budgets
│   └── banner.txt            # ASCII banner
├── agents/
│   └── openai.yaml           # Agent configuration
└── tests/
    └── regression_cases.md   # Regression test cases
```

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

If you are looking to explore strategies for securing your project, reach out for a chat on Telegram [@realnolan](https://t.me/realnolan).

[![X](https://img.shields.io/badge/X-000000?logo=x&logoColor=white)](https://x.com/exvulsec)
[![Telegram](https://img.shields.io/badge/Telegram-26A5E4?logo=telegram&logoColor=white)](https://t.me/realnolan)
[![Website](https://img.shields.io/badge/Website-000000?logo=safari&logoColor=white)](https://exvul.com)

## Acknowledgements

Built by [exvulsec](https://github.com/exvulsec).
