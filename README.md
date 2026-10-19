# node-fullstack-workflow

Pairs with nestjs-react-monorepo-starter. Covers the workflow from kickoff to release.

## What this is

A Claude Code plugin marketplace. It hosts one plugin, `kit`.

`kit` is an AI-driven workflow for building Node fullstack apps. It ships standards, workflow skills, and tool-agnostic recipes. NestJS and React today. Express and Next later.

## Install

Run these two commands once per machine:

```
claude plugin marketplace add akinurrahman/node-fullstack-workflow
claude plugin install kit@node-fullstack-workflow
```

To enable `kit` for everyone who clones a specific project, add this to that project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "node-fullstack-workflow": {
      "source": {
        "source": "github",
        "repo": "akinurrahman/node-fullstack-workflow"
      }
    }
  },
  "enabledPlugins": {
    "kit@node-fullstack-workflow": true
  }
}
```

This snippet only enables `kit` on machines where it is already installed with the two commands above.

Versions are not pinned yet. Once v1.0.0 is tagged, add a `ref` to the `source` block to pin:

```json
"source": {
  "source": "github",
  "repo": "akinurrahman/node-fullstack-workflow",
  "ref": "kit--v1.0.0"
}
```

## Layout

```
node-fullstack-workflow/
  .claude-plugin/
    marketplace.json          # marketplace catalog
  plugins/
    kit/
      .claude-plugin/
        plugin.json           # plugin manifest
      skills/                 # invokable as /kit:<skill>
      recipes/                # tool-agnostic recipes
```

Each recipe is a folder under `plugins/kit/recipes/<name>/` with a `RECIPE.md` and a `reference/` folder next to it. Shared reference goes in `reference/shared/`. Web reference goes in `reference/web/`. Backend reference goes in `reference/api/<backend>/`.

## Versioning

The plugin's version lives in `plugins/kit/.claude-plugin/plugin.json`. Users stay on the cached copy until that string changes.

Release tags follow the `kit--v<version>` format. Create one with:

```
claude plugin tag ./plugins/kit --push
```

## Companion repo

- nestjs-react-monorepo-starter: the starter this workflow pairs with.
