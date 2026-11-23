/**
 * Website visit stats through GoatCounter (free, cookieless).
 * Script Properties: GOATCOUNTER_CODE (the subdomain) and GOATCOUNTER_TOKEN (read-only API token).
 * Returns null when not configured, in which case nothing is printed.
 */
function getSiteStats_() {
  const props = PropertiesService.getScriptProperties();
  const code = props.getProperty("GOATCOUNTER_CODE");
  const token = props.getProperty("GOATCOUNTER_TOKEN");
  if (!code || !token || !/^[a-z0-9-]+$/i.test(code)) return null;

  const day = function (offset) {
    return Utilities.formatDate(new Date(Date.now() - offset * 86400000), "UTC", "yyyy-MM-dd'T'00:00:00'Z'");
  };
  const total = function (start, end) {
    const url = "https://" + code + ".goatcounter.com/api/v0/stats/total?start=" + encodeURIComponent(start) + "&end=" + encodeURIComponent(end);
    const res = UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error("GoatCounter " + res.getResponseCode());
    const j = JSON.parse(res.getContentText());
    return Number(j.total_utc != null ? j.total_utc : j.total) || 0;
  };
  try {
    return { yesterday: total(day(1), day(0)), week: total(day(7), day(0)) };
  } catch (err) {
    console.error(err);
    return null;
  }
}

function statsLine_(s) {
  return s ? "Visite al sito: " + s.yesterday + " ieri, " + s.week + " negli ultimi 7 giorni." : "";
}
