'use strict';

const glob = require('glob').sync;
const path = require('path');
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
 *     key1: {
 *       subkey1: value
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
    json[lang] = {};
    let messages = json[lang];
    pos[lang].forEach(item => {
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
        resolve({ [name]: data.items });
      }
    });
  })))
    .then(values => values.reduce((obj, entry) => ({ ...obj, ...entry }), {}));
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
