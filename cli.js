#!/usr/bin/env node
let argv = require('minimist')(process.argv);

if (argv._) {
  let myself = argv._.indexOf(__filename);
  if (myself == -1) {
    myself = argv._.findIndex(a => a.indexOf('.bin/vuei18n-po') != -1);
  }
  if (myself != -1 && myself + 1 < argv._.length) {
    argv.po = argv._.slice(myself + 1);
  }
  else if (myself == -1 && argv._.length > 0) {
    argv.po = argv._.slice();
  }
}

if (argv.h || argv.help || !argv.po) {
  const package = require('./package.json');
  console.log(`
  ${package.description}

  Usage:
    vuei18n-po [OPTIONS]  GLOB_OR_FILE.po ...

  Options:
    --pluralRules=FILE.js
      language plural rules to be imported for VueI18n pluralizationRules

    --messagesFile=FILE.json
      a single file containing all the translation strings, language as a key

    --messagesDir=DIRECTORY
      directory where translations go split by a language

`);
 process.exit(0);
}

if (argv.version) {
  const package = require('./package.json');
  console.log('vuei18n-po', package.version);
  process.exit(0);
}

const vuei18nPo = require('./index.js');

delete argv._;

vuei18nPo(argv);
