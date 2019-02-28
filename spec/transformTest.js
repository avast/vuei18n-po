const vuei18nPo = require('../index.js');

describe('po transform', function () {
  it('loads all files', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/*.po' });

    expect(Object.keys(translations)).toEqual(['cs', 'en', 'ko', 'pl']);
  });

  it('parses plurals', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/cs.po' });

    expect(translations.cs).toEqual(jasmine.objectContaining({
      issues: 'Byl zjištěn {n} problém. | Byly zjištěny {n} problémy. | Bylo zjištěno {n} problémů. | Bylo zjištěno {n} problémů.'
    }));
  });

  it('parses untranslated plurals', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/en.po' });

    expect(translations.en).toEqual(jasmine.objectContaining({
      issues: '{n} issue found. | {n} issues found.'
    }));
  });

  it('parses subkeys', async function () {
    const translations = await vuei18nPo({ po: 'spec/data/en.po' });

    expect(translations.en).toEqual(jasmine.objectContaining({
      gamemode: { game: { run: 'Launch' } }
    }));
  });
});
