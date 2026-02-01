<h1 align="center">npm-history</h1>

<p align="center">View and compare npm package download trends in hand-drawn <a href="https://xkcd.com">xkcd</a>-style charts. Free, open-source, no login required.</p>

<p align="center">
<a href="https://npm-history.com/#react&vue&svelte&solid-js">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://npm-history.com/api/svg?packages=react,vue,svelte,solid-js&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://npm-history.com/api/svg?packages=react,vue,svelte,solid-js" />
   <img alt="npm History Chart" src="https://npm-history.com/api/svg?packages=react,vue,svelte,solid-js" />
 </picture>
</a>
</p>

## Features

- **xkcd-style charts** — hand-drawn look powered by [chart.xkcd](https://github.com/nicehash/chart.xkcd)
- **Full npm history** — download data going back to January 2015
- **Compare up to 8 packages** side by side
- **Log scale** — compare packages with vastly different download counts
- **Aligned timeline** — normalize by package age instead of calendar date
- **Export** — PNG image, CSV data, shareable link, or embed code for your README
- **Dark theme** — SVG API supports light and dark themes for README embeds
- **URL sharing** — state is encoded in the URL hash, every chart is a shareable link

## Embed in your README

Add a live-updating download chart to your project's README:

```markdown
[![npm History Chart](https://npm-history.com/api/svg?packages=YOUR_PACKAGE&type=date)](https://npm-history.com/#YOUR_PACKAGE)
```

With dark theme support:

```html
<a href="https://npm-history.com/#YOUR_PACKAGE">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://npm-history.com/api/svg?packages=YOUR_PACKAGE&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://npm-history.com/api/svg?packages=YOUR_PACKAGE" />
   <img alt="npm History Chart" src="https://npm-history.com/api/svg?packages=YOUR_PACKAGE" />
 </picture>
</a>
```

## SVG API

Generate charts server-side via the SVG API:

```
GET https://npm-history.com/api/svg?packages=react,vue&theme=dark&log=true&align=false
```

| Parameter  | Description                          | Default |
| :--------- | :----------------------------------- | :------ |
| `packages` | Comma-separated package names        | —       |
| `theme`    | `light` or `dark`                    | `light` |
| `log`      | Log scale (`true` / `false`)         | `false` |
| `align`    | Align timelines (`true` / `false`)   | `false` |
| `legend`   | `upLeft` or `downRight`              | `upLeft`|

## Development

```bash
pnpm install
pnpm dev        # http://localhost:4321
```

## Tech Stack

- [Astro](https://astro.build) — full-stack framework
- [React](https://react.dev) — client-side UI
- [chart.xkcd](https://github.com/nicehash/chart.xkcd) — hand-drawn charting
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Vercel](https://vercel.com) — hosting & serverless
- [JSDOM](https://github.com/jsdom/jsdom) — server-side SVG rendering

## Contributing

Contributions are welcome. Open an issue or submit a PR.

## License

[MIT](LICENSE)
