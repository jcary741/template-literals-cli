#!/usr/bin/env node

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'node:process';

async function processFile(f, config, args, outdir) {
  if (!(await fsp.stat(f).then(() => true, () => false))) {
    throw new Error('File does not exist');
  }
  if (args['verbose']) {
    console.log('resolving module: ' + f);
  }
  // Use dynamic import for ESM modules
  const m = (await import(path.resolve(f))).default;
  let basename = path.basename(f).split('.').slice(0, -1).join('.');
  let outfile = null;
  if (args['indexes']) {
    if (path.basename(f).split('.').slice(0, -1)[0] !== 'index') {
      const outdirBase = path.join(outdir, basename);
      if (!(await fsp.stat(outdirBase).then(() => true, () => false))) {
        await fsp.mkdir(outdirBase, { recursive: true });
      }
      outfile = path.join(outdirBase, 'index.html');
    } else {
      outfile = path.join(outdir, 'index.html');
    }
  } else {
    outfile = path.join(outdir, [basename, 'html'].join('.'));
  }
  let result = m(config);
  result = result.replace(/\n[ ]+\n/g, '\n\n').trim();
  await fsp.writeFile(outfile, result);
  return outfile;
}

/**
 * Process template literal files and write output HTML files.
 * Prints a check or X for each file processed.
 * @param {Object} options
 * @param {string[]} options.inputFiles - Array of input file paths.
 * @param {string} options.outdir - Output directory path.
 * @param {Object} options.config - Config object to pass to templates.
 * @param {boolean} [options.indexes] - Whether to use index.html output structure.
 * @param {boolean} [options.verbose] - Enable verbose logging.
 * @param {boolean} [options.quiet] - Suppress all output except errors.
 * @returns {Promise<string[]>} Array of successfully generated file paths.
 */
export async function generateHtmlFromTemplates({ inputFiles, outdir, config, indexes = false, verbose = false, quiet = false }) {
  if (!outdir) {
    throw new Error('Missing required parameter: outdir');
  }
  if (!(await fsp.stat(outdir).then(() => true, () => false))) {
    await fsp.mkdir(outdir, { recursive: true });
  }
  const results = await Promise.allSettled(
    inputFiles.map(f => processFile(f, config, { indexes, verbose }, outdir))
  );
  const successful = [];
  results.forEach((res, i) => {
    const fname = inputFiles[i];
    if (res.status === 'fulfilled') {
      if (!quiet) {
        console.log(`\u2714 ${fname}`); // ✓
      }
      successful.push(fname);
    } else {
      console.log(`\u2718 ${fname}`); // ✗
      if (verbose) {
        console.error(res.reason);
      }
    }
  });
  return successful;
}

async function main() {
  const minimist = (await import('minimist')).default;
  const yamljs = (await import('yamljs')).default;
  const args = minimist(process.argv.slice(2), {
    boolean: ['indexes', 'quiet'],
    alias: {
      'outdir': 'o',
      'help': 'h',
      'config': 'c',
      'verbose': 'v',
      'quiet': 'q'
    },
    '--': true
  });

  function usage() {
    console.log(`
  Usage: \`template-literals --config "config.yml" --outdir "dist" ./src/*.js\`
  
  Options:
      -c, --config, --data    YAML or JSON config file which will be passed to the default export function of all files.
      -o, --outdir            Path to output directory. Note that existing files will be overwritten.
      
          --indexes           Instead of naming output files like 'outdir/filename.html' they will be named 'outdir/filename/index.html'. Note that 'index.js' will be named 'outdir/index.html', not 'outdir/index/index.html'.
      -v, --verbose           Display verbose logging information
      -q, --quiet             Suppress all output except errors (useful for CI)
  
      -- key1=value1 ...      Arguments after "--" are parsed as key=value pairs which should override those in the config file. Keys may use dot-notation to specify nested paths. Values may be provided as JSON.
      
  Examples:
      template-literals --config "config.yml" --outdir "dist" ./src/myPage.js -- exclamations=["OW"]
      template-literals --outdir "dist" ./src/myPage.js -- app_config.domain="example.com" app_config.keys='{"client_id":"asdf123"}'
      `);
    process.exit(0);
  }

  if (args.help || args['_'] === null || args['_'] === '') {
    usage();
  }

  // Load the config
  let config;
  if (args['config']) {
    try {
      if (path.extname(args['config']) === '.json') {
        config = JSON.parse(fs.readFileSync(args['config']))
      } else {
        config = yamljs.load(args['config'] || args['c']);
      }
    } catch (ex) {
      console.error('Failed to load config file.');
      console.error(ex);
      process.exit(1);
    }
  }
  if (!config) {
    config = {};
  }
  // parse extra vars and attempt to override them in the config.
  if (args['--']) {
    for (const _var of args['--']) {
      let [k, v] = _var.split('=', 2);
      k = k.replace(/^['"](.+?)['"]$/, '$1') // crude quote removal
      try {
        v = JSON.parse(v);
      } catch {
        // do nothing, just take v as a string value
      }
      let key_path = k.split('.');
      let obj = config;
      while (key_path.length > 1) {
        if (Array.isArray(obj)) {
          key_path[0] = parseInt(key_path[0])
          if (key_path[0] > obj.length) {
            throw new RangeError(`Failed to process variable "${k}": array index out of bounds of config.`)
          }
        } else {
          if (!(key_path[0] in obj)) {
            obj[key_path[0]] = {};
          }
        }
        obj = obj[key_path[0]];
        key_path.shift();
      }
      obj[key_path[0]] = v;
    }
  }
  if (!config) {
    console.log('Config not specified, empty object will be passed to templates');
  }
  const inputFiles = args['_'];
  const outdir = args['outdir'];
  const indexes = !!args['indexes'];
  const verbose = !!args['verbose'];
  const quiet = !!args['quiet'];
  if (verbose) {
    console.log(`config:\n${JSON.stringify(config)}\n`);
  }
  try {
    await generateHtmlFromTemplates({
      inputFiles,
      outdir,
      config,
      indexes,
      verbose,
      quiet
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
  main();
}
