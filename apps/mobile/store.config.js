// EAS Metadata reads this for the App Store listing. The copy lives in
// distribution/listing.json so Play and Apple share one source.
const listings = require('./distribution/listing.json')

const SITE = 'https://www.lifedeck.com.br'

module.exports = {
  configVersion: 0,
  apple: {
    copyright: `${new Date().getFullYear()} GBS Tecnologia da Informação Ltda`,
    categories: ['PRODUCTIVITY', 'LIFESTYLE'],
    info: Object.fromEntries(
      listings.map(listing => [
        listing.apple,
        {
          title: listing.name,
          subtitle: listing.subtitle,
          description: listing.description.join('\n'),
          keywords: listing.keywords,
          promoText: listing.promoText,
          marketingUrl: SITE,
          supportUrl: SITE,
          privacyPolicyUrl: `${SITE}/privacy`,
        },
      ]),
    ),
  },
}
