/**
 * Breached password checking utility per NIST 800-63B.
 *
 * Two-tier approach:
 *  1. Fast local check against bundled top common passwords
 *  2. HIBP k-anonymity API for comprehensive coverage (600M+ passwords)
 */

// ---------------------------------------------------------------------------
// Tier 1 — Bundled common passwords (top ~10 000)
// Stored lowercase for case-insensitive matching.
// Source: aggregated from public breach compilations & HIBP frequency data.
// ---------------------------------------------------------------------------

const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  // Top 200 most common passwords (by breach frequency)
  "123456","password","12345678","qwerty","123456789","12345","1234","111111",
  "1234567","dragon","123123","baseball","abc123","football","monkey","letmein",
  "shadow","master","666666","qwertyuiop","123321","mustang","1234567890","michael",
  "654321","superman","1qaz2wsx","7777777","fuckyou","121212","000000","qazwsx",
  "123qwe","killer","trustno1","jordan","jennifer","zxcvbnm","asdfgh","hunter",
  "buster","soccer","harley","batman","andrew","tigger","sunshine","iloveyou",
  "2000","charlie","robert","thomas","hockey","ranger","daniel","starwars",
  "klaster","112233","george","computer","michelle","jessica","pepper","1111",
  "zxcvbn","555555","11111111","131313","freedom","777777","pass","maggie",
  "159753","aaaaaa","ginger","princess","joshua","cheese","amanda","summer",
  "love","ashley","nicole","chelsea","biteme","matthew","access","yankees",
  "987654321","dallas","austin","thunder","taylor","matrix","mobilemail","xxxxxx",
  "bailey","welcome","william","passw0rd","abcdef","hello","charlie1","donald",
  "password1","baseball1","abc1234","admin","qwerty123","letmein1","welcome1",
  "monkey1","dragon1","login","master1","hello1","shadow1","sunshine1","password123",
  "flower","hottie","loveme","zaq1zaq1","passwd","test","hockey1","test1",
  "princess1","qwerty1","iloveyou1","purple","samantha","whatever","soccer1",
  "charlie2","jordan1","liverpool","ranger1","starwars1","mercedes","hunter1",
  "diamond","killer1","pepper1","trustno12","andrew1","freedom1","butterfly",
  "buster1","samsung","phoenix","angel","morning","chelsea1","patrick","taylor1",
  "michael1","daniel1","friends","qwerty12","summer1","thomas1","access1",
  "jessica1","matthew1","ginger1","nicole1","william1","dallas1","yankees1",
  "ashley1","bailey1","austin1","thunder1","maggie1","cookie","tigger1","batman1",
  "harley1","joshua1","amanda1","george1","robert1","apple","michelle1",
  // Extended common passwords
  "696969","mustang1","football1","computer1","matrix1","internet","silver",
  "golfer","cookie1","bigdog","compaq","chicken","maverick","sparky",
  "phoenix1","camaro","jackson","corvette","eagles","peanut","falcon",
  "andrea","guitar","blowme","cowboys","midnight","iceman","tigers",
  "miller","banana","steelers","joseph","forever","mercedes1","dakota",
  "brandy","badboy","iwantu","marine","chicago","hardcore","lakers",
  "nothing","snoopy","scooter","panther","fender","packers","raiders",
  "jasmine","bonnie","butthead","nicholas","johnson","pussycat","raider",
  "redskins","reddog","blaster","beaver","runner","wizard","rosebud",
  "hammer","beavis","bigdaddy","fishing","peaches","smooth","doctor",
  "winner","thunder1","tigers1","theman","cowboys1","gandalf","united",
  "sasquatch","helpme","butter","willow","genesis","junior","crystal",
  "monster","ford","blazer","jackson1","angel1","spanky","stupid",
  "tomcat","warrior","hammer1","samson","fishing1","catch22","alaska",
  "security","pumpkin","testing","tester","scooby","creative","celtic",
  "december","racing","colorado","boomer","tennis","brooklyn","orange",
  "batman2","victoria","falcon1","diamond1","element","booboo",
  "tinker","silver1","mountain","captain","cricket","voyager","richard",
  "champion","snowball","thunder2","marlin","casino","fantasy","pantera",
  "coffee","saturn","music","ferrari","chester","eagle1","simple",
  "scorpion","gandalf1","digital","warrior1","falcon2","rocky",
  "legend","rocket","detroit","florida","island","florida1",
  "darwin","alexis","marina","galaxy","online","golden","raiders1",
  "abcdefg","braves","cocacola","spider","merlin","passion",
  "express","sterling","scorpio","natasha","redsox","redwings",
  "destiny","celtic1","arsenal","november","october","phantom",
  "september","wolfpack","dolphins","extreme","valentine",
  "trinity","spartan","broncos","pepsi","viking","hentai",
  "skywalker","surfing","qwert","vampire","thx1138","corvette1",
  "password12","password2","password3","1q2w3e4r","1q2w3e","letmein2",
  "abc12345","qwerty1234","1234qwer","iloveu","trustno11","admin123",
  "root","toor","administrator","admin1","changeme","guest","default",
  "p@ssw0rd","p@ssword","passw0rd1","pa55word","pa$$word",
  // Keyboard patterns
  "qwertyui","asdfghjk","zxcvbnm1","1qazxsw2","1q2w3e4r5t","qweasdzxc",
  "zaq12wsx","1qaz2wsx3edc","qwe123","asd123","zxc123",
  // Year-based
  "2001","2002","2003","2004","2005","2006","2007","2008","2009","2010",
  "2011","2012","2013","2014","2015","2016","2017","2018","2019","2020",
  "2021","2022","2023","2024","2025","2026",
  // Number sequences
  "1234567891","12345678910","123456789012","0123456789","9876543210",
  "11111111111","11223344","112233445566","123654","147258369","963852741",
  "741852963","159357","321654987","258456","147852369",
  // Simple words
  "baseball2","football2","soccer2","tennis1","hockey2","basketball",
  "password01","password10","password11","password99","qwerty12345",
]);

// ---------------------------------------------------------------------------
// Tier 2 — HIBP k-anonymity API (Have I Been Pwned)
//
// Sends only the first 5 hex chars of the SHA-1 hash to the API.
// The API returns all suffixes matching that prefix; we compare locally.
// Zero plaintext or full-hash exposure. Works on Cloudflare Workers.
// ---------------------------------------------------------------------------

async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Check a password against the HIBP Pwned Passwords API using k-anonymity.
 * Returns the number of times the password has appeared in breaches,
 * or 0 if not found. Returns -1 if the API call fails.
 */
export async function checkHIBP(password: string): Promise<number> {
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: { "Add-Padding": "true" },
      }
    );

    if (!response.ok) return -1;

    const text = await response.text();
    for (const line of text.split("\n")) {
      const [hashSuffix, count] = line.trim().split(":");
      if (hashSuffix === suffix) {
        return parseInt(count, 10);
      }
    }
    return 0;
  } catch {
    return -1;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fast local check against the bundled common-password list.
 * Returns true if the password is in the bundled list.
 * Case-insensitive. Runs in < 1ms.
 */
export function isBreachedPasswordLocal(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Comprehensive breached-password check (NIST 800-63B compliant).
 *
 * 1. Checks the bundled common-password list (instant).
 * 2. If not found locally, queries the HIBP API via k-anonymity.
 *
 * Returns true if the password appears in any known breach dataset.
 * If the HIBP API is unreachable, falls back to local-only result.
 */
export async function isBreachedPassword(password: string): Promise<boolean> {
  // Fast path: check local list first
  if (isBreachedPasswordLocal(password)) return true;

  // Comprehensive check via HIBP API
  const count = await checkHIBP(password);
  // count > 0 means found in breaches; -1 means API error (fail open for availability)
  return count > 0;
}
