/**
 * Assembles everything the Tauri bundle carries besides the shell:
 *
 * - the web app's static build, which the WebView loads
 * - the Bun runtime, shipped as the sidecar binary
 * - the server bundled into one file, next to the two things it reads from
 *   disk at run time: sharp's native addon and the tag CSV
 *
 * sharp is the reason the sidecar is the Bun runtime rather than a
 * `bun build --compile` executable. It loads its `.node` addon through
 * `createRequire(import.meta.url)`, which inside a compiled binary points at
 * Bun's virtual filesystem, so the lookup fails and the process dies on
 * startup — with `--external sharp` too, since that resolves from the same
 * virtual root. A real `node_modules` beside a real file is what makes it
 * resolvable, and the compiled binary would have cost the same ~100 MB
 * anyway, because that is the runtime it embeds.
 */
import { $ } from "bun";
import { chmod, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const desktop = dirname(import.meta.dir);
const repo = join(desktop, "..", "..");
const tauri = join(desktop, "src-tauri");
const resources = join(tauri, "resources");
const binaries = join(tauri, "binaries");

/**
 * The target triple Tauri expects on a sidecar's filename. Read from rustc
 * rather than guessed, so it is the one the bundler will look for.
 */
async function hostTriple(): Promise<string> {
  const report = await $`rustc -vV`.text().catch(() => "");
  const host = /^host:\s*(\S+)$/m.exec(report)?.[1];
  if (!host) {
    throw new Error(
      "Could not read the host target triple from `rustc -vV`. " +
        "Tauri needs a Rust toolchain — see https://v2.tauri.app/start/prerequisites/"
    );
  }
  return host;
}

/**
 * The `<platform>-<arch>` token sharp puts in its optional dependencies.
 * Assumes glibc, which is what every runner this is built on uses.
 */
function sharpPlatform(): string {
  const os = process.platform === "win32" ? "win32" : process.platform;
  return `${os}-${process.arch}`;
}

/**
 * sharp declares an optional dependency per platform and the installer takes
 * every one it can resolve — on Linux that means a musl build nothing here
 * will ever load, at 18 MB. Drop the ones that do not match this machine.
 */
async function dropForeignBinaries(dir: string, keep: string): Promise<void> {
  for (const name of await readdir(dir)) {
    const isPlatformSpecific = /^sharp-(?:libvips-)?[a-z0-9]+-[a-z0-9]+$/.test(
      name
    );
    if (isPlatformSpecific && !name.endsWith(keep)) {
      await rm(join(dir, name), { recursive: true, force: true });
    }
  }
}

async function stageSharp(): Promise<void> {
  const installed = join(repo, "apps", "server", "node_modules", "sharp");
  const manifest = await Bun.file(join(installed, "package.json")).json();
  const version: unknown = manifest.version;
  if (typeof version !== "string") {
    throw new Error("Could not read sharp's version from the workspace.");
  }

  // Pinned to the exact version the workspace resolved, so the packaged app
  // and `bun run dev` never run different sharps. `type: module` is here
  // because Bun reads the nearest package.json to decide how to load the
  // bundle sitting next to it.
  await writeFile(
    join(resources, "package.json"),
    `${JSON.stringify(
      {
        name: "nai-desktop-studio-server",
        private: true,
        type: "module",
        dependencies: { sharp: version },
      },
      null,
      2
    )}\n`
  );

  await $`bun install --production`.cwd(resources).quiet();
  await dropForeignBinaries(
    join(resources, "node_modules", "@img"),
    sharpPlatform()
  );
}

async function directorySize(path: string): Promise<string> {
  const output = await $`du -sh ${path}`.text().catch(() => "");
  return output.split("\t")[0] ?? "?";
}

const triple = await hostTriple();

await rm(resources, { recursive: true, force: true });
await rm(binaries, { recursive: true, force: true });
await mkdir(resources, { recursive: true });
await mkdir(binaries, { recursive: true });

console.log(`Building the web app`);
await $`bun run build`.cwd(join(repo, "apps", "web"));

console.log(`Bundling the server`);
await $`bun build --target=bun --minify --external sharp ${join(
  repo,
  "apps",
  "server",
  "src",
  "index.ts"
)} --outdir ${resources}`.quiet();

console.log(`Staging sharp`);
await stageSharp();

console.log(`Copying the tag list`);
await mkdir(join(resources, "scripts"), { recursive: true });
await cp(
  join(repo, "scripts", "danbooru_e621_merged.csv"),
  join(resources, "scripts", "danbooru_e621_merged.csv")
);

// Tauri finds a sidecar by filename, and the suffix is how it knows the
// binary belongs to the platform being built.
console.log(`Copying the Bun runtime as the sidecar`);
const suffix = process.platform === "win32" ? ".exe" : "";
const sidecar = join(binaries, `bun-${triple}${suffix}`);
await cp(process.execPath, sidecar);
await chmod(sidecar, 0o755);

console.log(
  [
    ``,
    `  sidecar    ${await directorySize(sidecar)}  bun-${triple}${suffix}`,
    `  resources  ${await directorySize(resources)}`,
    `  web        ${await directorySize(join(repo, "apps", "web", "dist", "client"))}`,
    ``,
  ].join("\n")
);
