'use strict';

const glob = require('glob').sync;
const mkdir = require('make-dir').sync;
const path = require('path');
const fs = require('fs');
const po = require('pofile');

/**
 * transform a set of gettext translation files into a JavaScript and JSON consumable by VueI18n.prototype.getChoiceIndex and messages
 * @param options {
 *   po: input filename, glob, array of filenames or array of globs
 *   localeNameHeader: (optional) .po header that contains the name of a locale; if missing, locale name is taken from the file name
 *   pluralRules: (optional) output javascript file exporting an object { langCode1: (choice, choicesLength) => choiceIndex, langCode2: ... }
 *   messagesFile: (optional) single output JSON file containing all translations for all languages
 *   messagesDir: (optional) output directory containing a JSON file per language
 * }
 * @return promise {
 *   langCode1: {
 *     messages: {
 *       key1: {
 *         subkey1: value
 *       }
 *     }
 *   }
 * }
 */
async function main(options) {
  if (!options || !options.po) {
    throw new Error('missing input filename');
  }

  const inputPoFiles = glob2names(options.po);

  const pos = await parseFiles(inputPoFiles, options.localeNameHeader);

  let json = {};

  for (var lang in pos) {
    json[lang] = {
      messages: {},
      plural: pos[lang].plural
    };
    let messages = json[lang].messages;

    pos[lang].messages.forEach(item => {
      let value;
      if (!item.msgid_plural) {
        value = item.msgstr[0] || item.msgid;
      }
      else {
        if (item.msgstr.some(str => str.indexOf('|') != -1)) {
          throw new Error('plural messages cannot contain | (see https://kazupon.github.io/vue-i18n/guide/pluralization.html#accessing-the-number-via-the-pre-defined-argument)');
        }

        value =  (item.msgstr.some(str => str !== '') ?
          item.msgstr.join(' | ') :
          item.msgid + ' | ' + item.msgid_plural)
          .replace(/%s/g, '{n}');
      }
      objectPathSet(messages, item.msgctxt, value);
    });
  }

  if (options.messagesFile) {
    if (path.basename(options.messagesFile) != options.messagesFile) {
      mkdir(path.dirname(options.messagesFile));
    }

    let messages = {};
    for (let lang in json) {
      messages[lang] = json[lang].messages;
    }
    fs.writeFileSync(options.messagesFile, JSON.stringify(messages, null, 2), 'utf8');
  }

  if (options.pluralRules) {
    if (path.basename(options.pluralRules) != options.pluralRules) {
      mkdir(path.dirname(options.pluralRules));
    }

    let rules = 'module.exports = {\n' +
      Object.keys(json).map(lang => '  ' + lang + ': ' + json[lang].plural).join(',\n') +
      '\n};\n';

    fs.writeFileSync(options.pluralRules, rules, 'utf8');
  }

  if (options.messagesDir) {
    mkdir(options.messagesDir);

    for (let lang in json) {
      fs.writeFileSync(path.join(options.messagesDir, lang + '.json'), JSON.stringify(json[lang].messages, null, 2), 'utf8');
    }
  }

  return json;
}

function glob2names(patterns) {
  return [].concat(
    ...((Array.isArray(patterns) ? patterns : [ patterns ])
      .map(pattern => glob(pattern)))
  );
}

function parseFiles(fileNames, localeNameHeader) {
  return Promise.all(fileNames.map(fname => new Promise((resolve, reject) => {
    po.load(fname, (err, data) => {
      if (err) {
        reject(err);
      }
      else {
        const name = (localeNameHeader && data.headers[localeNameHeader]) || path.basename(fname, path.extname(fname));
        resolve({
          [name]: {
            messages: data.items,
            ...parsePlurals(data.headers['Plural-Forms'])
          }
        });
      }
    });
  })))
    .then(values => values.reduce((obj, entry) => ({ ...obj, ...entry }), {}));
}

function parsePlurals(header) {
  const match = header.match(/nplurals=([0-9]+).*plural=(.+)/);  // the trailing \n is already removed by pofile
  if (!match) {
    throw new Error('Cannot parse plural definition: ' + header);
  }
  let pluralFunc = match[2];

  return { plural: 'function (n) { const rv = ' + pluralFunc + '; return Number(rv); }' };
}

function objectPathSet(obj, path, value) {
  const parts = path.split(".");
  let counter = parts.length;
  let ref;

  const getRef = ref => ref || obj;

  for (let part of parts) {
    counter--;
    ref = getRef(ref)[part] = (counter && (getRef(ref)[part] || {})) || value;
  }
}

module.exports = main;
