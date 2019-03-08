vuei18n-po
==========

Transform gettext .po files for vue-i18n.

When it comes to plural support, the best data format nowadays is MessageFormat. Unfortunatelly, it isn't well supported neither by Vue nor by translation services.
This modules takes gettext translations (that have a good support among translators) and transforms both the messages and plural rules to be consumable by VueI18n.

man vuei18n-po
--------------
```
  Usage:
    vuei18n-po [OPTIONS]  GLOB_OR_FILE.po ...

  Options:
    --pluralRules=FILE.js
      language plural rules to be imported for VueI18n pluralizationRules

    --messagesFile=FILE.json
      a single file containing all the translation strings, language as a key

    --messagesDir=DIRECTORY
      directory where translations go split by a language

    --whiteList=GLOB
      files that are tested for presence of the message keys;
      the unnused keys are filtered out
```

Usage
-----
```javascript
const vuei18nPo = require('vuei18n-po');

await vuei18nPo({
    po: [ 'en.po', 'translations/**/*.po' ],
    pluralRules: 'spec/data/out/choices.js',
    messagesFile: 'generated/allInOne.json',
    messagesDir: 'generated',
    whiteList: 'src/**/*.vue'
});
```

Plug it in
----------

```javascript
new VueI18n({
      locale: 'en',
      messages: {
        en: require('./generated/en.json'),
        ja: require('./generated/ja.json')
      },
      pluralizationRules: require('./generated/choices.js')
});
```
