vuei18n-po
==========

Transform gettext .po files for vue-i18n.

When it comes to plural support, the best data format nowadays is MessageFormat. Unfortunatelly, it isn't well supported neither by Vue nor by translation services.
This modules takes gettext translations (that have a good support among translators) and transforms both the messages and plural rules to be consumable by VueI18n.

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
