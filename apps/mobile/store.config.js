// EAS Metadata reads this for the App Store listing. The copy lives in
// distribution/listing.json so Play and Apple share one source.
const listings = require('./distribution/listing.json')

const SITE = 'https://www.lifedeck.com.br'

const NONE = 'NONE'

// Age rating: a planner with no objectionable content, no chat between users,
// no open browser and nothing for sale. Lands at 4+.
const advisory = {
  alcoholTobaccoOrDrugUseOrReferences: NONE,
  contests: NONE,
  gamblingSimulated: NONE,
  gunsOrOtherWeapons: NONE,
  horrorOrFearThemes: NONE,
  matureOrSuggestiveThemes: NONE,
  medicalOrTreatmentInformation: NONE,
  profanityOrCrudeHumor: NONE,
  sexualContentGraphicAndNudity: NONE,
  sexualContentOrNudity: NONE,
  violenceCartoonOrFantasy: NONE,
  violenceRealistic: NONE,
  violenceRealisticProlongedGraphicOrSadistic: NONE,
  gambling: false,
  lootBox: false,
  advertising: false,
  messagingAndChat: false,
  userGeneratedContent: false,
  healthOrWellnessTopics: false,
  parentalControls: false,
  ageAssurance: false,
  unrestrictedWebAccess: false,
  seventeenPlus: false,
  kidsAgeBand: null,
  ageRatingOverride: NONE,
  koreaAgeRatingOverride: NONE,
}

module.exports = {
  configVersion: 0,
  apple: {
    copyright: `${new Date().getFullYear()} GBS Tecnologia da Informação Ltda`,
    categories: ['PRODUCTIVITY', 'LIFESTYLE'],
    advisory,
    info: Object.fromEntries(
      listings.flatMap(listing =>
        listing.apple.map(locale => [
          locale,
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
    ),
  },
}
