#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");
const target = path.join(root, "build-render");

async function exists(p) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

async function rmrf(p) {
  if (await exists(p)) await fs.promises.rm(p, { recursive: true, force: true });
}

async function copy(src, dest) {
  if (!(await exists(src))) return;
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  // use fs.cp when available (node 16+)
  if (fs.promises.cp) {
    await fs.promises.cp(src, dest, { recursive: true });
  } else {
    // fallback: copy files/dirs
    const stat = await fs.promises.stat(src);
    if (stat.isDirectory()) {
      await fs.promises.mkdir(dest, { recursive: true });
      const entries = await fs.promises.readdir(src);
      for (const e of entries) {
        await copy(path.join(src, e), path.join(dest, e));
      }
    } else {
      await fs.promises.copyFile(src, dest);
    }
  }
}

(async () => {
  try {
    console.log("Preparing build-render folder...");
    await rmrf(target);
    await fs.promises.mkdir(target, { recursive: true });

    // copy compiled files
    if (!(await exists(outDir))) {
      console.error("dist/ not found. Did you run `npm run build`?");
      process.exit(1);
    }
    console.log("Copying dist -> build-render");
    await copy(outDir, target);

    // copy package.json and lockfile so Render can install deps
    console.log("Copying package.json");
    await copy(path.join(root, "package.json"), path.join(target, "package.json"));
    const lock = path.join(root, "package-lock.json");
    if (await exists(lock)) {
      console.log("Copying package-lock.json");
      await copy(lock, path.join(target, "package-lock.json"));
    }

    // copy sequelize config
    const sequelizeCfg = path.join(root, "sequelize.config.cjs");
    if (await exists(sequelizeCfg)) {
      console.log("Copying sequelize.config.cjs");
      await copy(sequelizeCfg, path.join(target, "sequelize.config.cjs"));
    }

    // copy docs folder (swagger custom JS)
    const docsSrc = path.join(root, "src", "docs");
    if (await exists(docsSrc)) {
      console.log("Copying docs/");
      await copy(docsSrc, path.join(target, "docs"));
    }

    // copy uploads (static assets)
    const uploads = path.join(root, "uploads");
    const targetUploads = path.join(target, "uploads");
    if (await exists(uploads)) {
      console.log("Copying uploads/");
      await copy(uploads, targetUploads);
    } else {
      // Ensure uploads directory exists even if empty
      console.log("Creating uploads/ directory");
      await fs.promises.mkdir(targetUploads, { recursive: true });
    }

    // copy .env.example if present (do not copy .env)
    const envExample = path.join(root, ".env.example");
    if (await exists(envExample)) {
      await copy(envExample, path.join(target, ".env.example"));
    }

    console.log("build-render assembled at", target);
  } catch (err) {
    console.error("Error assembling build-render:", err);
    process.exit(1);
  }
})();
