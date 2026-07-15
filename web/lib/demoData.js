// Sample data for the public "Live demo" tour. Lets anyone explore the dashboard's
// features with realistic content — no login, no real customer data, nothing saved.
// Timestamps are generated relative to "now" so the recency + weekly chart always
// look alive.

export const DEMO_PROFILE = {
  id: "demo",
  business_name: "Summit Locksmith Co.",
  agent_name: "Alex",
  contact_email: "demo@dispango.com",
  dispatch_phone: "+15875551234",
  fallback_number: "+15875550000",
  cell_number: "+15875551234",
  inbound_number: "+15875559012",
  answer_mode: "ai_first",
  business_hours: null,
  timezone: "America/Edmonton",
  service_area: "Calgary and surrounding areas, within 30 km",
  services_offered: "Lockouts, rekeying, lock replacement, car key fobs, safe opening",
  pricing_notes: "Service call starts at $89. After-hours surcharge $40.",
  avg_job_value: 165,
  provision_status: "active",
  active: true,
  subscription_status: "active",
  plan: "Dispango",
  created_at: new Date(Date.now() - 62 * 864e5).toISOString(),
};

const H = 36e5, D = 864e5;

// [minutes-ago-ended, name, phone, door_type, damage, urgency, vehicle, outcome, summary, transcript, texted]
const SEED = [
  [8, "Jamie Ortiz", "+14035550142", "car_lockout", "Locked keys in the trunk at the grocery store", "urgent", "2019 Honda Civic, silver", "lead", "Caller locked keys in trunk of their Civic at the Co-op parking lot. Needs someone ASAP. Texted to dispatch.", true],
  [46, "Sarah Kim", "+14035550178", "house_lockout", "Front door, no spare key, kids inside", "urgent", null, "lead", "Locked out of the house, young kids inside. Very anxious. Confirmed address and dispatched.", true],
  [95, null, "+18005559911", null, null, null, null, "spam", "Auto-warranty robocall. Ended quickly, no text sent.", false],
  [180, "Noah Bell", "+14035550110", "rekey", "Just moved in, wants all locks rekeyed", "normal", null, "lead", "New homeowner wants 3 exterior locks rekeyed. Not urgent — happy with a next-day visit.", true],
  [340, "Mia Roy", "+14035550133", "lock_replacement", "Deadbolt broke, won't turn", "high", null, "lead", "Broken deadbolt on the side door. Wants it replaced today if possible.", true],
  [520, "Dmitri V.", "+14035550188", "car_key", "Lost the only fob for the truck", "high", "2021 Ford F-150", "lead", "Lost sole key fob for an F-150. Needs a replacement + programming. Quoted range, dispatched.", true],
  [1180, "Aisha N.", "+14035550155", "safe", "Can't open the floor safe, forgot combo", "normal", null, "lead", "Forgotten safe combination on a residential floor safe. Booked for tomorrow morning.", true],
  [1500, null, "+14035550101", null, "Wrong number", "low", null, "wrong_number", "Caller was trying to reach a plumber. Politely redirected. No text sent.", false],
  [1880, "Carlos M.", "+14035550122", "house_lockout", "Locked out after work, back door", "urgent", null, "lead", "Locked out at the back door after a late shift. Dispatched immediately.", true],
  [2600, "Priya S.", "+14035550166", "car_lockout", "Keys locked in car at the trailhead", "urgent", "2020 Subaru Outback", "lead", "Locked out at Nose Hill trailhead. Sent nearest tech, ~25 min ETA.", true],
  [3400, "Info caller", "+14035550144", null, "Asked about pricing only", "low", null, "info_only", "Caller only wanted a ballpark on rekeying. Given range, no job booked. No text sent.", false],
  [4300, "Tom H.", "+14035550199", "lock_replacement", "Smart lock install on rental unit", "normal", null, "lead", "Landlord wants a smart lock installed on a rental. Scheduled for later this week.", true],
];

export function demoCalls() {
  const now = Date.now();
  return SEED.map(([mins, name, phone, door, dmg, urg, veh, outcome, summary, texted], i) => {
    const ended = new Date(now - mins * 60000);
    const dur = 45 + ((i * 37) % 130);
    const started = new Date(ended.getTime() - dur * 1000);
    return {
      vapi_call_id: `demo-${i}`,
      client_id: "demo",
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: dur,
      caller_phone: phone,
      caller_name: name,
      service_address: outcome === "lead" ? sampleAddress(i) : null,
      door_type: door,
      damage_description: dmg,
      urgency: urg,
      vehicle_info: veh,
      outcome,
      summary,
      transcript: outcome === "lead"
        ? `[assistant]: Thanks for calling Summit Locksmith, this is Alex — what's going on?\n[user]: ${dmg}.\n[assistant]: Got it. Can I grab the address and a good callback number?\n[user]: Sure, it's ${sampleAddress(i)}.\n[assistant]: Perfect — I'll have someone head your way and text you the details.`
        : null,
      notified_at: texted ? ended.toISOString() : null,
      notified_phone: texted ? "+15875551234" : null,
    };
  });
}

function sampleAddress(i) {
  const streets = ["17 Ave SW", "Kensington Rd NW", "Macleod Trail", "Bowness Rd NW", "Elbow Dr SW", "Edmonton Trail NE"];
  return `${100 + (i * 73) % 900} ${streets[i % streets.length]}, Calgary`;
}
