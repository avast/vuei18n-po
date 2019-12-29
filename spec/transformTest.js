const vuei18nPo = require('../index.js');
const rmrf = require('rimraf').sync;
const glob = require('glob').sync;

describe('po transform', function () {
  it('loads all files', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/??.po' });

    expect(Object.keys(translations)).toEqual(['cs', 'en', 'ko', 'pl']);
  });

  it('parses plurals', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/cs.po' });

    expect(translations.cs.messages).toEqual(jasmine.objectContaining({
      issues: 'Byl zjištěn {n} problém. | Byly zjištěny {n} problémy. | Bylo zjištěno {n} problémů. | Bylo zjištěno {n} problémů.'
    }));
  });

  it('parses untranslated plurals', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/en.po' });

    expect(translations.en.messages).toEqual(jasmine.objectContaining({
      issues: '{n} issue found. | {n} issues found.'
    }));
  });

  it('parses subkeys', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/en.po' });

    expect(translations.en.messages).toEqual(jasmine.objectContaining({'gamemode.game.run': 'Launch'}));
  });

  it('returns a valid plural function', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/*.po' });

    const cs = function (p) { return eval('(' + translations.cs.plural + ')(' + p + ')'); };
    const en = function (p) { return eval('(' + translations.en.plural + ')(' + p + ')'); };
    const ko = function (p) { return eval('(' + translations.ko.plural + ')(' + p + ')'); };
    const pl = function (p) { return eval('(' + translations.pl.plural + ')(' + p + ')'); };

    // why is plural[2] never used in cs is a mystery
    expect(cs(0)).toBe(3);
    expect(cs(1)).toBe(0);
    expect(cs(2)).toBe(1);
    expect(cs(5)).toBe(3);

    expect(en(0)).toBe(1);
    expect(en(1)).toBe(0);
    expect(en(2)).toBe(1);
    expect(en(5)).toBe(1);

    expect(ko(0)).toBe(0);
    expect(ko(1)).toBe(0);
    expect(ko(2)).toBe(0);
    expect(ko(5)).toBe(0);

    expect(pl(0)).toBe(2);
    expect(pl(1)).toBe(0);
    expect(pl(2)).toBe(1);
    expect(pl(5)).toBe(2);
    expect(pl(22)).toBe(1);
  });

  it('filters out unused keys', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/en.po', whiteList: 'spec/data/*.vue' });

    expect(Object.keys(translations.en.messages)).toEqual(jasmine.arrayContaining(['about', 'issues', 'gamemode.game.run']));  // these are used in loc.vue
    expect(Object.keys(translations.en.messages)).not.toEqual(jasmine.arrayContaining(['global.launch']));  // global.launch is never used in loc.vue
  });
});

describe('po code generation', function () {
  beforeEach(function () {
    rmrf('spec/data/out');
  });

  afterAll(function () {
    rmrf('spec/data/out');
  });

  it('saves messages into a single JSON', async function () {
    await vuei18nPo({ po: [ 'spec/data/en.po', 'spec/data/cs.po' ], messagesFile: 'spec/data/out/messages.json' });

    const ls = glob('spec/data/out/**', { nodir: true });

    expect(ls.length).toBe(1);

    try {
      json = require('./data/out/messages.json');

      expect(json).toEqual(jasmine.objectContaining({
        en: jasmine.objectContaining({ 'global.launch': 'Launch' })
      }));
    }
    catch(ex) {
      fail(ex);
    }
  });

  it('saves plural rules', async function () {
    await vuei18nPo({ po: [ 'spec/data/en.po', 'spec/data/cs.po' ], pluralRules: 'spec/data/out/rules.js' });

    const ls = glob('spec/data/out/**', { nodir: true });

    expect(ls.length).toBe(1);

    try {
      rules = require('./data/out/rules.js');

      expect(rules.cs(2)).toBe(1);
    }
    catch(ex) {
      fail(ex);
    }
  });

  it('saves messages into split JSON files', async function () {
    await vuei18nPo({ po: [ 'spec/data/en.po', 'spec/data/cs.po' ], messagesDir: 'spec/data/out' });

    const ls = glob('spec/data/out/**', { nodir: true });

    expect(ls.length).toBe(2);

    try {
      json = require('./data/out/en.json');

      expect(json).toEqual(jasmine.objectContaining({ 'global.launch': 'Launch' }));
    }
    catch(ex) {
      fail(ex);
    }
  });
});
