# Components contributor instructions

- Use Node 24 and pinned npm 11.19.0.
- This repository owns reusable Components, catalogs and their tests.
  Application Blueprints and the npm-backed Storybook showcase stay in
  `nsreehari/gik-samples`.
- Preserve public npm APIs and use published external GIK packages.
- For this corporate environment, run all installs, builds, typechecks,
  tests and registry operations in CI only. Never access npmjs locally.
- Never read, copy or commit credentials or local environment files.
- Run build, typecheck, unit tests and the actual packed-consumer check.
  Generate locks in CI and commit reviewed, source-verified artifacts.
- Work on a dedicated branch and open a linked PR. Never merge, force-push
  or push implementation directly to main. Never publish automatically.
- Issues require human approval, `agent-ready` and exactly one route label.
  Claim only unassigned issues with no existing PR.
- Configure npm trusted publishing for this repository's `publish.yml`
  through an approved package-owner channel; never copy publisher secrets.
