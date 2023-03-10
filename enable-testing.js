#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

const projectDir = new URL(".", import.meta.url).pathname;

const packageJson = JSON.parse(
  await fs.readFile(path.resolve(projectDir, "package.json"), "utf-8")
);

const scripts = {
  "dev:vite": "vite dev",
  "dev:storybook": "start-storybook --modern --no-open --port 6006",
  "build:vite": "vite build",
  "build:storybook":
    "build-storybook --modern --output-dir build/styleguide-storybook",
  test: 'concurrently -c "#fcc72a","#45ba4b" --kill-others-on-fail "npm:test:*"',
  "test:vitest": "vitest run --passWithNoTests",
  "test:playwright": "playwright test",
  vitest: "vitest watch",
  playwright:
    'npx chokidar-cli "playwright/**/*.ts" --initial -c "npx playwright test"',
};
for (const [task, command] of Object.entries(scripts)) {
  packageJson.scripts[task] = packageJson.scripts[task] || command;
}
if (packageJson.scripts.dev === "vite dev") {
  packageJson.scripts.dev =
    'concurrently -c "#676778","#990f3f" --kill-others-on-fail "npm:dev:*"';
}
if (packageJson.scripts.build === "vite build") {
  packageJson.scripts.build = "npm run build:vite && npm run build:storybook";
}

const devDependencies = {
  "@playwright/test": "^1.22.1",
  "@storybook/addon-actions": "^6.5.3",
  "@storybook/addon-essentials": "^6.5.3",
  "@storybook/addon-links": "^6.5.3",
  "@storybook/addon-svelte-csf": "^2.0.4",
  "@storybook/builder-vite": "^0.2.0",
  "@storybook/svelte": "^6.5.3",
  "@testing-library/svelte": "^3.1.0",
  "happy-dom": "^8.1.0",
  "vite-tsconfig-paths": "^4.0.3",
  vitest: "^0.26.2",
};
for (const [dependency, version] of Object.entries(devDependencies)) {
  packageJson.devDependencies[dependency] =
    packageJson.devDependencies[dependency] || version;
}

for (const folder of [".storybook", "playwright", "playwright/tests"]) {
  // eslint-disable-next-line no-await-in-loop
  await fs.stat(path.resolve(projectDir, folder)).catch(() => {
    return fs.mkdir(path.resolve(projectDir, folder));
  });
}

async function writeFile(filename, body) {
  await fs.writeFile(path.resolve(projectDir, filename), body);
  process.stdout.write(`created "${filename}" (${body.length} bytes)\n`);
}

await writeFile("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
await writeFile(
  "vitest.config.ts",
  `import { sveltekit } from "@sveltejs/kit/vite";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    environment: "happy-dom",
    exclude: [...configDefaults.exclude, "package", "playwright"],
  },
});
`
);
await writeFile(
  "playwright.config.ts",
  `import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";

const CI = !!process.env.CI;

const config: PlaywrightTestConfig = {
  testDir: "./playwright/tests",
  fullyParallel: true,
  forbidOnly: CI,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  webServer: {
    port: 5173,
    reuseExistingServer: true,
    command: \`\${
      process.platform === "darwin" ? "npm run build:vite && " : ""
    } npm run preview -- --port 5173\`,
  },
  ...(CI
    ? {
        projects: [
          { name: "Chrome", use: { ...devices["Desktop Chrome"] } },
          { name: "Firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "Safari", use: { ...devices["Desktop Safari"] } },
        ],
      }
    : {}),
};

export default config;
`
);
await writeFile(
  "playwright/tests/hello-world.spec.ts",
  `import { test, expect } from "@playwright/test";

test("hello world", async ({ page }) => {
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.locator("text=Hello world").click();
  await expect(page.locator("text=Hello you")).toBeVisible();
});
`
);
await writeFile(
  ".storybook/main.cjs",
  `const path = require("path");
const preprocess = require("svelte-preprocess");
const { default: tsconfigPaths } = require("vite-tsconfig-paths");

module.exports = {
  core: { builder: "@storybook/builder-vite" },
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(ts|svelte)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-svelte-csf",
  ],
  staticDirs: ["../static"],
  svelteOptions: {
    preprocess: preprocess({ sourceMap: true }),
  },
  viteFinal(config) {
    /* eslint-disable no-param-reassign */
    config.base = "";
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.$lib = path.resolve(__dirname, "../src/lib");
    config.plugins.push(tsconfigPaths());
    config.build = config.build || {};
    config.build.chunkSizeWarningLimit = 1000;
    return config;
  },
};
`
);
const appScssExists = await fs
  .stat(path.resolve(projectDir, "src/app.scss"))
  .catch(() => false);

if (appScssExists) {
  await writeFile(
    ".storybook/preview.cjs",
    `import "../src/app.scss";
`
  );
}

await writeFile(
  ".husky/pre-push",
  `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run test
`
);
await fs.chmod(path.resolve(projectDir, ".husky/pre-push"), "755");

const helloComponentExists = await fs
  .stat(path.resolve(projectDir, "src/lib/components/Hello/Hello.svelte"))
  .catch(() => false);

if (helloComponentExists) {
  await writeFile(
    "src/lib/components/Hello/Hello.spec.ts",
    `import { expect, it, describe, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import Hallo from "./Hello.svelte";

/**
 * Note! For demonstation purposes only. this is a terrible unittest:
 * - It doesn't test any complexity we wrote
 * - The components is trivial an unlikely to break/change
 */
describe("Hello component", () => {
  it("should render based on prop", async () => {
    const { getByText, component } = render(
      Hallo as any,
      { name: "world" } as any
    );
    const el = getByText("Hello world");
    expect(el.textContent).toBe("Hello world");
    component.$set({ name: "you" });
    await tick();
    expect(el.textContent).toBe("Hello you");
  });

  it("should trigger handlers based on events", async () => {
    const { getByText, component } = render(Hallo, { name: "click" });
    const listener = vi.fn();
    component.$on("click", listener);
    fireEvent(getByText("Hello click"), new MouseEvent("click"));
    expect(listener).toBeCalledTimes(1);
  });
});
`
  );
  await writeFile(
    "src/lib/components/Hello/Hello.stories.svelte",
    `<script lang="ts">
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import Hello from "./Hello.svelte";
</script>

<Meta
  title="Example/Hello"
  component={Hello}
  argTypes={{
    name: { control: "text" },
    click: { action: "click" },
  }}
/>

<Template let:args>
  <Hello name={args.name} on:click={args.click} />
</Template>

<Story
  name="Wereld"
  args={{
    name: "wereld",
  }}
/>

<Story
  name="World"
  args={{
    name: "world",
  }}
/>
`
  );
}
process.stdout.write(
  "\n\nTo bring in the additional depencencies for Vitest & Storybook run:\n\nyarn  # or npm install\n"
);
