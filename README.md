# QueryCraft

A browser-based visual SQL query builder and dataset explorer built with Next.js, React, and Zustand.

QueryCraft lets you create nested filter logic using a drag-and-drop condition builder, preview generated SQL-like queries, run them against in-memory sample datasets, and export results or query definitions.

## Features

- Visual query builder with nested `AND` / `OR` groups
- Drag-and-drop condition reordering
- Live SQL-like preview panel
- Result table with CSV export
- Built-in sample datasets: `users`, `products`, `orders`, `workers`, and `cities`
- Schema switcher with field-driven operator selection
- Local persistence for theme, selected schema, current query, history, and presets
- Import/export query JSON
- Query history and restore support
- Dark/light theme toggle
- Keyboard shortcuts for run and reset

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand for state management
- dnd-kit for drag-and-drop sorting
- lucide-react icons

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install dependencies

```bash
cd query
npm install
```

### Run locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Build for production

```bash
npm run build
npm start
```

## Project Structure

- `app/page.tsx` - main client page, renders the query builder layout and panels
- `components/` - UI building blocks for builder, preview, results, history, and header
- `store/query-store.ts` - state management and app actions
- `lib/query-engine.ts` - query evaluation, SQL preview generation, and validation logic
- `lib/storage.ts` - localStorage/cookie persistence helpers
- `data/` - sample schema definitions and datasets
- `types/` - shared TypeScript interfaces and query model definitions

## How It Works

1. The app stores the query as a tree of groups and conditions.
2. Each condition is typed by field and supports operators based on field type.
3. The SQL preview is generated from the current query tree for quick insight.
4. Running the query filters the selected dataset in-memory and displays matching rows.
5. Query actions persist state across reloads using cookies and localStorage.

## Supported Datasets

The app includes five built-in schemas and datasets:

- `users`
- `products`
- `orders`
- `workers`
- `cities`

Each schema defines fields with typed metadata: `string`, `number`, `enum`, `date`, or `boolean`.

## Supported Operators

The query builder supports the following condition operators:

- `equals`
- `notEquals`
- `contains`
- `startsWith`
- `endsWith`
- `isEmpty`
- `isNotEmpty`
- `greaterThan`
- `lessThan`
- `greaterThanOrEqual`
- `lessThanOrEqual`
- `between`
- `in`
- `notIn`
- `regex`

## UI Panels

- `SchemaPanel` - browse table schema fields and available filter fields
- `QueryWorkspace` - build nested query groups and conditions
- `SQLPreviewPanel` - see the generated SQL-like query
- `ResultsPanel` - view matching dataset records and export CSV
- `HistoryPanel` - revisit and restore previously executed queries

## User Actions

- `Run Query` - executes the current query against the selected dataset
- `Reset` - clears the current query builder state
- `Import` - loads a saved query JSON file
- `Export` - downloads the current query definition as JSON
- `Export CSV` - downloads current result set as a CSV file

## Persistence

QueryCraft persists user settings and history automatically:

- Theme and selected schema in `localStorage`
- Saved presets in `localStorage`
- Query execution history in `localStorage`
- Current query structure in cookies for reload persistence

## Keyboard Shortcuts

- `Ctrl/Cmd + Enter` — Run query
- `Ctrl/Cmd + r` — Reset query

## Testing

Run unit tests with:

```bash
npm test
```

## Extending the App

To add a new dataset:

1. Add a new schema module in `data/` with `key`, `label`, `icon`, and `fields`.
2. Add a matching dataset array file.
3. Export the new schema and dataset from `data/index.ts`.
4. The UI automatically includes the new schema tab.

## Notes

- The SQL preview is a user-friendly representation generated from the query tree; it is not executed by a real SQL engine.
- Query execution is performed in the browser against sample in-memory data.

## License

This repository includes a MIT licences.
