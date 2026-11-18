// Categories describe words in the title, not a guessed source video for a Short.
// New numbered uploads are picked up automatically when the catalogue refreshes.
const normalize = title => title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const includes = expression => title => expression.test(title);
const both = (first, second) => title => first.test(title) && second.test(title);
const companies = includes(/\b(?:offensive|fake) companies\b/);
const products = includes(/\b(?:illegal|offensive|awful|fake) products?\b|\bproduct should be illegal\b/);
const ideas = includes(/\b(?:offensive|awful) ideas\b/);
const cityPlans = includes(/\boffensive city plans\b/);
const definitions = [
  {id: 'scavenger-hunts', label: 'All Scavenger Hunts', match: includes(/\bscavenger hunts?\b/)},
  {id: 'college-scavenger-hunt', label: 'College Scavenger Hunt', match: includes(/\bcollege scavenger hunts?\b/)},
  {id: 'omegle-scavenger-hunt', label: 'Omegle Scavenger Hunt', match: includes(/\bomegle scavenger hunts?\b/)},
  {id: 'discord-scavenger-hunt', label: 'Discord Scavenger Hunt', match: includes(/\bdiscord scavenger hunts?\b/)},
  {id: 'vr-scavenger-hunt', label: 'VR Scavenger Hunt', match: includes(/\bvr scavenger hunts?\b/)},
  {id: 'omegle', label: 'All Omegle Videos', match: includes(/\bomegle\b/)},
  {id: 'omegle-last-man-standing', label: 'Omegle Last Man Standing', match: includes(/\bomegle last man standing\b/)},
  {id: 'omegle-do-what-we-say', label: 'Omegle: Do What We Say', match: includes(/\bomegle do what we say\b/)},
  {id: 'omegle-olympics', label: 'Omegle Olympics', match: includes(/\bomegle olympics\b/)},
  {id: 'omegle-try-not-to-laugh', label: 'Omegle: Try Not To Laugh', match: both(/\bomegle\b/, /\btry not to laugh\b/)},
  {id: 'try-not-to-laugh', label: 'All Try Not To Laugh', match: includes(/\btry not to laugh\b/)},
  {id: 'zoom-try-not-to-laugh', label: 'Try Not To Laugh: Zoom Meeting', match: both(/\btry not to laugh\b/, /\bzoom meetings?\b/)},
  {id: 'tiktok-try-not-to-laugh', label: 'Try Not To Laugh: TikTok Live', match: both(/\btry not to laugh\b/, /\btiktok live\b/)},
  {id: 'business-try-not-to-laugh', label: 'Try Not To Laugh: Business Meeting', match: both(/\btry not to laugh\b/, /\bbusiness meetings?\b/)},
  {id: 'city-government-try-not-to-laugh', label: 'Try Not To Laugh: City & Government', match: both(/\btry not to laugh\b/, /\b(?:city|government) meetings?\b/)},
  {id: 'we-pitched', label: 'We Pitched\u2026', match: title => /\b(?:pitched|presenting)\b|\boffensive (?:slides|video games|plans)\b/.test(title) || companies(title) || products(title) || ideas(title) || cityPlans(title)},
  {id: 'pitched-companies', label: 'Offensive Companies', match: companies},
  {id: 'pitched-products', label: 'Offensive & Illegal Products', match: products},
  {id: 'pitched-ideas', label: 'Offensive Ideas', match: ideas},
  {id: 'pitched-city-plans', label: 'Offensive City Plans', match: cityPlans},
  {id: 'livestreams', label: 'TikTok & Livestreams', match: includes(/\b(?:tiktok|livestreams?|streamers?)\b/)},
  {id: 'tiktok-olympics', label: 'TikTok Olympics', match: includes(/\btiktok olympics\b/)},
  {id: 'zoom', label: 'Zoom Meetings & Pranks', match: includes(/\bzoom\b/)},
  {id: 'classes-debates', label: 'Classes & Debates', match: includes(/\b(?:classes|class|debates)\b/)},
  {id: 'city-government-meetings', label: 'City & Government Meetings', match: includes(/\b(?:city|government|school board) meetings?\b/)},
  {id: 'business-focus-groups', label: 'Business Meetings & Focus Groups', match: includes(/\b(?:business meetings?|focus groups?)\b/)},
  {id: 'dating', label: 'Dating & Relationships', match: includes(/\b(?:dating|girlfriends?|tinder|couples|first kiss|first date|wingman|sleepover)\b/)},
  {id: 'rental-girlfriends', label: 'Rental Girlfriends', match: includes(/\b(?:rented girlfriends|rental girlfriends)\b/)},
  {id: 'trade-up', label: 'Trade Up Challenges', match: includes(/\b(?:trade up|trading items up)\b/)},
  {id: 'selling-challenges', label: 'Selling Challenges', match: includes(/\bfirst to sell\b/)},
  {id: 'challenges', label: 'Other Challenges', match: includes(/\b(?:last to laugh|last to leave|last to get kicked|truth or dare|first to sell|best outfit wins|hour to make a viral song)\b/)},
  {id: 'prank-calls', label: 'Prank Calls', match: includes(/\bprank call(?:ed|s)?\b/)},
  {id: 'best-of', label: 'Best Of & Highlights', match: includes(/\bbest of\b|\b(?:family friendly|bazerk) core\b/)},
  {id: 'offensive-creations', label: 'Offensive Creations', match: includes(/\bwe made (?:an? )?offensive\b/)},
];
const knownIds = new Set(definitions.map(category => category.id));

export function getVideoCategoryIds(video) {
  if (typeof video?.title !== 'string') return [];
  const title = normalize(video.title);
  const ids = definitions.filter(category => category.match(title)).map(category => category.id);
  return ids.length ? ids : ['other'];
}

export function matchesCategory(video, categoryId = 'all') {
  if (typeof video?.title !== 'string') return false;
  if (categoryId === 'all') return true;
  if (categoryId !== 'other' && !knownIds.has(categoryId)) return false;
  return getVideoCategoryIds(video).includes(categoryId);
}

export function listCategories(videos, {includeShorts = false} = {}) {
  const totals = new Map();
  const eligibleCounts = new Map();
  let allCount = 0;
  for (const video of videos) {
    const ids = getVideoCategoryIds(video);
    const eligible = includeShorts || !video.isShort;
    if (eligible) allCount++;
    for (const id of ids) {
      totals.set(id, (totals.get(id) || 0) + 1);
      if (eligible) eligibleCounts.set(id, (eligibleCounts.get(id) || 0) + 1);
    }
  }
  return [
    {id: 'all', label: 'All videos', count: allCount},
    ...[...definitions, {id: 'other', label: 'Other videos'}]
      .filter(category => totals.has(category.id))
      .map(({id, label}) => ({id, label, count: eligibleCounts.get(id) || 0})),
  ];
}
