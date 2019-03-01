const vuei18nPo = require('../index.js');
const rmrf = require('rimraf').sync;
const VueI18n = require('vue-i18n');
const Vue = require('vue');

describe('VueI18n', function () {
  Vue.use(VueI18n);

  beforeEach(function () {
    rmrf('spec/data/out');
  });

  afterAll(function () {
    rmrf('spec/data/out');
  });

  it('loads messages from a generated file', async function () {
    await vuei18nPo({ po: [ 'spec/data/en.po', 'spec/data/cs.po' ], messagesDir: 'spec/data/out' });

    let vi18n = new VueI18n({
      locale: 'en',
      messages: {
        en: require('./data/out/en.json'),
        cs: require('./data/out/cs.json')
      }
    });

    expect(vi18n.t('gamemode.game.run')).toBe('Launch');
  });

  it('translates plurals', async function () {
    await vuei18nPo({ po: [ 'spec/data/en.po', 'spec/data/cs.po' ], messagesDir: 'spec/data/out', pluralRules: 'spec/data/out/choices.js' });
    const choices = require('./data/out/choices.js');

    let vi18n = new VueI18n({
      locale: 'cs',
      messages: {
        en: require('./data/out/en.json'),
        cs: require('./data/out/cs.json')
      },
      pluralizationRules: choices
    });

    expect(vi18n.tc('issues', 2)).toBe('Byly zjištěny 2 problémy.');
  });
});
