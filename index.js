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
 *   whiteList: (optional) glob of files that are tested for presence of the message keys; the unnused are filtered out
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

  if (inputPoFiles.length == 0) {
    console.error('Warning: no files found at', Array.isArray(options.po) ? options.po.join(', ') : options.po);
  }

  const pos = await parseFiles(inputPoFiles, options.localeNameHeader);

  if (options.whiteList) {
    filterByWhitelist(options.whiteList, pos);
  }

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
      messages[item.msgctxt] = value;
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

    let rules = '/* eslint-disable no-extra-semi */\nmodule.exports = {\n' +
      Object.keys(json).map(lang => '  "' + lang + '": ' + json[lang].plural).join(',\n') +
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
        try {
          const name = (localeNameHeader && data.headers[localeNameHeader]) || path.basename(fname, path.extname(fname));
          resolve({
            [name]: {
              messages: data.items,
              ...parsePlurals(data.headers['Plural-Forms'])
            }
          });
        }
        catch (ex) {
          reject(ex);
        }
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

function filterByWhitelist(whitelistGlob, pos) {
  let removalCandidates = new Set([]);  // for messages filtering at the end
  let removalRes = new Set([]);         // for whitelist files processing

  // preprocess the messages from *.po so that we can traverse the disk with whitelist files in one go
  for (let lang in pos) {
    pos[lang].messages.forEach(m => {
      if (removalCandidates.has(m.msgctxt)) {
        return;
      }
      if (!m.msgctxt) {
        let meaningfulCopy = {};
        for (let k in m) {
          if (!!m[k] && (typeof m[k] !== 'object' || Object.keys(m[k]).length > 0))
            meaningfulCopy[k] = m[k];
        }
        console.error('invalid entry in language', lang, ':', JSON.stringify(meaningfulCopy));
        return;
      }

      removalCandidates.add(m.msgctxt);

      let reEntry = { msgctxt: m.msgctxt };

      if (m.msgctxt.indexOf('.') == -1) {
        reEntry.re = new RegExp('[\'"`]' + m.msgctxt + '[\'"`]');
      }
      else {
        // either one of the components ends with .', .", .` or .$ or the full key matches
        // `namespace + '.rest.of.the.path'` will thus fail
        // also, `foo.${something}.bar` will incorrectly let foo.xxx.yyy in
        const components = m.msgctxt.split('.');
        const reStr = '([\'"`]' + components.slice(1)
          .reduce((prefixes, val, idx) => {  // reduce returns an array of strings [ c0, c0[.]c1, c0[.]c1[.]c2, ... ]
            prefixes.push(prefixes[idx] + '[.]' + val);  // take the last entry in the array and create a new one, one component longer
            return prefixes;
          }, [ components[0] ])
          .join('[.][\'"`$])|([\'"`]') + '[\'"`])';  // join the prefixes returned from reduce
                                                     // as alternatives <some quotation>c0.<some quotation> || <some quotation>c0.c1.<some quotation> || ... || <full key>

        // example: "foo.bar.baz" turns into
        // /(['"`]foo[.]['"`$])|(['"`]foo[.]bar[.]['"`$])|(['"`]foo[.]bar[.]baz['"`])/
        // or, nicer
        // ( ['"`]foo[.]['"`$] )  |  ( ['"`]foo[.]bar[.]['"`$] )  |  ( ['"`]foo[.]bar[.]baz['"`] )
        reEntry.re = new RegExp(reStr);
      }

      removalRes.add(reEntry);
    });
  }

  if (removalCandidates.size == 0) {
    // unexpected, but possible
    return;
  }

  // whitelist files traversal
  const whitelist = glob(whitelistGlob);

  whitelist.every(fname => {
    try {
      const text = fs.readFileSync(fname, 'utf8');

      removalRes.forEach(reEntry => {
        if (reEntry.re.test(text)) {  // as soon as a key is found at least once, we don't need to test any more
          removalCandidates.delete(reEntry.msgctxt);
          removalRes.delete(reEntry);
        }
      });

      return removalCandidates.size != 0;  // all keys found, no need to process further
    }
    catch (ex) {
      console.error(ex);
    }
  });

  if (removalCandidates.size == 0) {
    return;
  }

  for (let lang in pos) {
    pos[lang].messages = pos[lang].messages.filter(m => !removalCandidates.has(m.msgctxt));
  }
}

module.exports = main;
