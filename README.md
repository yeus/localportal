# ProfPage

ProfPage is a static, password-protected lecture page for sharing university
course material. Lecture content is written as Markdown, converted to HTML at
build time, encrypted, and published as static files.

## How the page works

1. Markdown files in `content/` are converted to HTML by `build.js`.
2. Each lecture is encrypted with AES-GCM using a key derived from
   `LECTURE_PW`.
3. The build copies the page shell and stylesheet into `public/`, writes a
   lecture manifest, and places the encrypted lectures in `public/lectures/`.
4. The browser loads the encrypted lecture after the visitor enters the
   password and decrypts it locally.

The generated `public/` directory is ignored by Git. It is the deployable
output and is recreated by every build.

## Requirements

- Node.js
- Yarn Classic (the project currently uses Yarn 1)

Install the dependencies from the project root:

```sh
yarn install
```

This repository also contains a Nix development shell. If you use direnv,
allow it from the project root with `direnv allow`.

## Start the page locally

There is no separate `yarn start` script currently. The recommended `yarn dev`
command resolves a password, builds the page, starts a local server, and
rebuilds automatically when `content/`, `index.html`, or `style.css` changes:

```sh
yarn dev
```

`yarn dev` does not require `LECTURE_PW`. If the variable is not set, the
command creates a random development password on first use and saves it in the
gitignored `.dev-password` file, so later runs reuse the same password. Before
building, it asks for the password: press Enter to accept the saved one, type
another one to replace it, or wait a few seconds and it continues with the
saved password automatically. To use a password without touching the file, set
the variable before starting:

```sh
export LECTURE_PW='choose-a-development-password'
yarn dev
```

The active unlock password is printed in the terminal right before the server
starts. Open the local URL printed by `serve` (normally
`http://localhost:3000`) and unlock the page with that password. Keep the
command running while editing files.

If `public/` has already been built and you only want to serve the existing
output, use:

```sh
yarn serve
```

`yarn serve` does not rebuild the lectures and does not need `LECTURE_PW`.
If the source content or password has changed, run a new build first.

## Build manually

`LECTURE_PW` is required for every build:

```sh
LECTURE_PW='choose-a-password' yarn build
```

The build creates or replaces:

- `public/index.html` — the page shell and browser-side decryption logic
- `public/style.css` — the copied stylesheet
- `public/manifest.json` — lecture IDs and titles
- `public/lectures/*.enc` — encrypted lecture files
- `public/dateien/` — copied from the optional root-level `dateien/` directory

To preview that output separately, run `yarn serve` after the build.

## Add or edit lectures

Create or edit a Markdown file in `content/`. For example:

```markdown
# Week 1: Introduction

Lecture notes go here.
```

You do not need to edit `manifest.json` or anything under `public/` manually.
Run `yarn dev` while working, or run `LECTURE_PW='...' yarn build` before
deploying.

The optional `dateien/` directory is copied into `public/dateien/`, so static
course files can be referenced from lecture HTML when needed.

### Titles and file names

- The filename without `.md` is the **lecture ID**. A file named `week-1.md`
  is opened with `#week-1` and encrypted to `public/lectures/week-1.enc`.
- The sidebar title comes from the **first level-one heading** (`# ...`) in
  the file.
- If there is no level-one heading, the filename is used as the title with
  hyphens replaced by spaces (`week-1.md` becomes `week 1`).

The sidebar link shows the title, not the filename. Renaming a file changes the
URL fragment and the encrypted file name, but not the sidebar label or order
as long as the file has a level-one heading.

### Sidebar order

The sidebar is sorted alphabetically by title in the browser. The order is
controlled by the heading text, not by the filename, the file's modification
time, or the order of files on disk. Sorting uses the browser's default locale,
so titles with umlauts, accents, or mixed case can sort differently in
different browsers.

To change the order, change the heading text, for example by prefixing titles
with a number or a term name. There is no separate order field.

The special ID `introduction` is removed from the sorted list and used for the
fixed welcome link at the top of the sidebar. Renaming `introduction.md` breaks
that link; its title does not appear in the list.

The generated `manifest.json` keeps the filesystem order and is not the sidebar
order. The browser sorts the list after loading it, and the build uses the
first manifest entry when checking a saved password on page load.

### Heading formatting

The title is the first line that matches `#` followed by whitespace, anywhere
in the file:

- `# Title` becomes the title. `## Title` (level two) and `#Title` (no space)
  do not match.
- Only the first matching line is used, even when it is not the first line of
  the file.
- The text is used as written. Markdown formatting is not rendered in the
  sidebar, so `**Archiv Winter 22-23**` is shown with the asterisks and is
  sorted by that raw text.
- A `# ...` line inside a fenced code block before the real heading is picked
  up as the title.

YAML front matter is not read. A block such as:

```markdown
---
title: "Lecture 1"
---
```

is rendered into the lecture page as a horizontal rule and a level-two heading,
and does not set the sidebar title.

### Lecture content

Lecture bodies are converted with standard Markdown. Raw HTML such as
`<iframe>` is passed through, so embedded videos work.

## Use the page as a visitor

1. Open the deployed page in a modern browser.
2. Enter the password and select **Unlock**.
3. Choose a lecture from the sidebar, or use a lecture URL fragment such as
   `#week-1`.
4. Select **Log out** when finished.

The page remembers a successful password in the browser's `localStorage` so
that the visitor does not have to enter it on every page load. Logging out
removes that stored password.

## Troubleshooting

- `LECTURE_PW is not set`: set the variable before running `yarn build`.
  `yarn dev` does not need it and uses `.dev-password` instead.
- The dev password changed: delete `.dev-password` to generate a new one, or
  set `LECTURE_PW` to bypass the file.
- The page shows old lectures: rebuild with the current password, then reload
  the page.
- The page does not unlock: use the same password that was used to create the
  current `public/` output, and open the page through `yarn serve` or `yarn dev`
  rather than opening `index.html` with `file://`.
- To stop the development server and watcher, press `Ctrl-C` in the terminal.

## Deployment

The included `netlify.toml` configures Netlify to:

- run `yarn build`
- publish `public/`

Configure `LECTURE_PW` as a protected build environment variable in Netlify.
Do not commit the password or put it in a tracked file. Other static hosts can
use the same process: run the build with `LECTURE_PW` set, then publish the
resulting `public/` directory.

## Security notes

This is client-side content encryption, not server-side authentication:

- The static host can serve the encrypted lecture files to anyone who requests
  them.
- The password is used in the browser and is currently cached in `localStorage`
  until the visitor logs out or clears site data.
- Use HTTPS in production and avoid unlocking the page on a shared computer.
- Anyone who knows the password can decrypt the lecture content, so use a
  strong password and treat it as shared access to the course material.

The normal build path is `build.js`, which uses `LECTURE_PW`. The older
`scripts/encrypt.sh` script expects an external `pagecrypt` command and a
different `PAGECRYPT_PASSWORD` variable; it is not used by the package scripts
or the Netlify build.

## Available commands

| Command | Purpose |
| --- | --- |
| `yarn install` | Install dependencies |
| `yarn dev` | Resolve the password, build, serve, and rebuild on source changes |
| `yarn test` | Run the unit tests for the dev password prompt |
| `yarn build` | Create the deployable `public/` directory |
| `yarn serve` | Serve the existing `public/` directory |
| `yarn watch` | Rebuild when source files change; does not start a server |
