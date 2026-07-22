# kintone-skills

Sync Kintone's internal Claude skills into your project directory.

## Usage

```sh
npx kintone-skills
```

This fetches the latest skill files from Kintone's internal skills repo and
copies them into your current directory. Re-run the same command any time to
pull updates — it's the same command for first install and every update
after that.

### Options

```
--dir <path>   Target directory (default: ./)
-h, --help     Show help
```

## Requirements

- [git](https://git-scm.com/downloads) installed locally
- Access to Kintone's internal skills repo already configured (SSH key or
  credential helper/token) — if you can `git clone` the repo yourself, this
  tool will work

## How it works

- Nothing is installed as a live git repository — the tool clones the skills
  repo into a temporary directory, copies the files into your target
  directory, and discards the clone. There's no `.git` left behind to commit
  or push to.
- The `projects/` folder is yours: it's seeded once on first run and is never
  touched again on later updates, so any code you write there is safe.

## License

ISC — see [LICENSE](LICENSE).
