/**
 * Public-information research about a client: their website, a Google Maps
 * link (name and coordinates read from the URL only) and every phone number,
 * email and social link found on the public pages. Read-only, capped, https only.
 */
const FETCH_LIMIT = 300000;   // characters kept from a page
const MAX_URLS = 3;

function researchClient_(r) {
  const out = { urls: [], maps: null, site: null, phones: [], emails: [], socials: [], notes: [] };
  const phones = {};
  const addPhone = function (p) { const n = normalizePhone_(p); if (n) phones[n] = true; };

  addPhone(r.phone);
  (String(r.descrizione).match(/(\+?\d[\d\s().-]{7,17}\d)/g) || []).forEach(addPhone);

  const urls = extractUrls_((r.sito || "") + " " + r.descrizione).slice(0, MAX_URLS);
  urls.forEach(function (raw) {
    try {
      let url = raw;
      if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(url)) url = expandUrl_(url);
      out.urls.push(url);
      if (/google\.[a-z.]+\/maps|maps\.google\./i.test(url)) {
        out.maps = parseMapsUrl_(url);
        return;
      }
      if (!out.site) {
        const page = fetchPage_(url);
        if (page) {
          out.site = page.info;
          page.phones.forEach(addPhone);
          out.emails = out.emails.concat(page.emails);
          out.socials = out.socials.concat(page.socials);
        }
      }
    } catch (err) {
      out.notes.push("Non sono riuscito a leggere " + raw);
    }
  });

  out.phones = Object.keys(phones);
  out.emails = unique_(out.emails).slice(0, 5);
  out.socials = unique_(out.socials).slice(0, 6);
  return out;
}

function unique_(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); }

function extractUrls_(text) {
  const found = String(text || "").match(/(?:https?:\/\/|www\.)[^\s<>"')]+/gi) || [];
  const direct = String(text || "").trim();
  if (!found.length && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(direct)) found.push(direct);
  return unique_(found.map(function (u) {
    u = u.replace(/[.,;]+$/, "");
    return /^https?:\/\//i.test(u) ? u : "https://" + u;
  })).filter(isSafeUrl_);
}

function isSafeUrl_(u) {
  const m = /^https:\/\/([^\/:?#]+)(?::\d+)?(\/|$|\?|#)/i.exec(u);
  if (!m) return false;
  const host = m[1].toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^[\d.]+$/.test(host) || host.indexOf(":") >= 0) return false;   // raw IPs
  return host.indexOf(".") > 0;
}

function expandUrl_(url) {
  let current = url;
  for (let i = 0; i < 3; i++) {
    const res = UrlFetchApp.fetch(current, { followRedirects: false, muteHttpExceptions: true });
    const loc = res.getHeaders()["Location"] || res.getHeaders()["location"];
    if (!loc || !isSafeUrl_(loc)) break;
    current = loc;
  }
  return current;
}

function parseMapsUrl_(url) {
  const place = /\/maps\/place\/([^\/@?]+)/i.exec(url);
  const coords = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(url);
  let name = "";
  if (place) { try { name = decodeURIComponent(place[1].replace(/\+/g, " ")); } catch (e) { name = place[1]; } }
  return { url: url, name: name, lat: coords ? coords[1] : "", lng: coords ? coords[2] : "" };
}

function fetchPage_(url) {
  const res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true, followRedirects: true,
    headers: { "User-Agent": "SmartRoutineBot/1.0 (+public info lookup)" }
  });
  if (res.getResponseCode() >= 400) return null;
  const type = String(res.getHeaders()["Content-Type"] || res.getHeaders()["content-type"] || "");
  if (type && type.indexOf("html") < 0) return null;
  const html = res.getContentText().slice(0, FETCH_LIMIT);

  const pick = function (re) { const m = re.exec(html); return m ? decodeEntities_(m[1]).replace(/\s+/g, " ").trim().slice(0, 300) : ""; };
  const info = {
    url: url,
    title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i),
    description: pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
      pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
    heading: pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "")
  };
  const phones = (html.match(/tel:([+\d][\d\s().-]{6,})/gi) || []).map(function (t) { return t.slice(4); })
    .concat((html.replace(/<[^>]+>/g, " ").match(/(?:\+39\s?)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4}\b/g) || []));
  const emails = (html.match(/mailto:([^"'?\s>]+)/gi) || []).map(function (m) { return m.slice(7).toLowerCase(); });
  const socials = (html.match(/https?:\/\/(?:www\.)?(?:instagram|facebook|tiktok|linkedin|wa)\.(?:com|me)\/[^\s"'<>]+/gi) || []);
  return { info: info, phones: phones, emails: emails, socials: socials };
}

function decodeEntities_(s) {
  return String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

/** Digits only, Italian default country code, 8 to 15 digits. Returns "+39..." or "". */
function normalizePhone_(raw) {
  let d = String(raw || "").replace(/[^\d+]/g, "");
  if (!d) return "";
  if (d.indexOf("00") === 0) d = "+" + d.slice(2);
  if (d.charAt(0) !== "+") d = (d.charAt(0) === "3" && d.length >= 9 && d.length <= 10) ? "+39" + d : d.length >= 9 ? "+" + d : "";
  const digits = d.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? "+" + digits : "";
}
