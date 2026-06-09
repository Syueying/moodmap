#!/usr/bin/env python3
"""
Generate mock moodmap data for 6 MBTI personality types.
Each profile covers 2024 + 2025 — import any file via the ↑ Import button.

Usage:
    python3 generate_mock_data.py

Output: mock_data/moodmap-<TYPE>.json
"""

import json, math, os, random
from datetime import date, timedelta, datetime

EMOTIONS = ['excited', 'happy', 'calm', 'anxious', 'sad', 'angry']
IDX      = {e: i for i, e in enumerate(EMOTIONS)}

# ─────────────────────────────────────────────────────────────────────────────
# PERSONALITY PROFILES
# Each profile defines:
#   base_weights  — baseline probability for each emotion (must sum to ~1)
#   intensity_*   — gaussian distribution for 1-10 scale
#   log_rate      — fraction of days they actually bother logging
#   seasonal      — list of (emotion, amplitude, peak_month) sine adjustments
#   weekday       — {emotion: [Mon..Sun] multipliers} array of 7 floats
#   notes         — pool of authentic one-liners for that type
# ─────────────────────────────────────────────────────────────────────────────

PROFILES = {

    'ENTP': {
        'tagline': 'The Debater — ideas machine, perpetually stimulated, surprisingly restless',
        #                      exc   hap   calm  anx   sad   ang
        'base_weights':       [0.26, 0.28, 0.12, 0.18, 0.08, 0.08],
        'intensity_mean': 7.1, 'intensity_std': 1.4,
        'log_rate': 0.84,
        'seasonal': [
            ('excited', 0.09, 1),   # Jan: new year = new plans, very hyped
            ('excited', 0.07, 9),   # Sep: fall energy, ideas season
            ('anxious', 0.06, 7),   # Jul: ideas need to ship, haven't
            ('happy',   0.05, 4),   # Apr: spring debate season
        ],
        'weekday': {
            #              Mon   Tue   Wed   Thu   Fri   Sat   Sun
            'excited':  [1.15, 1.10, 1.00, 1.00, 0.88, 0.95, 1.05],
            'happy':    [1.05, 1.05, 1.00, 1.00, 1.00, 1.05, 0.95],
            'anxious':  [0.85, 0.90, 1.00, 1.00, 1.10, 1.00, 0.90],
        },
        'notes': [
            "Spent 3 hours down a rabbit hole and have zero regrets",
            "Convinced someone to change their mind. Good day.",
            "This problem is way more interesting than expected",
            "Why does everyone think this is unsolvable?",
            "Had four ideas before breakfast",
            "The meeting was terrible but the argument was excellent",
            "Everything is connected to everything else",
            "Can't sleep — the idea won't leave me alone",
            "Finally articulated the thing I've been thinking about for weeks",
            "Proved someone wrong. They agreed. Rare and beautiful.",
            "Started three new projects. Finished zero.",
            "The chaos is the point",
            "Read the paper. Disagree with the conclusion. Working on rebuttal.",
            "Talked to a stranger for two hours. Worth every minute.",
            "New framework unlocked. Everything makes sense now.",
            "Need more people who can keep up",
        ],
    },

    'INFP': {
        'tagline': 'The Mediator — feels everything at full volume, poetry in, poetry out',
        #                      exc   hap   calm  anx   sad   ang
        'base_weights':       [0.06, 0.12, 0.10, 0.34, 0.32, 0.06],
        'intensity_mean': 7.9, 'intensity_std': 1.8,
        'log_rate': 0.74,
        'seasonal': [
            ('sad',     0.11, 1),   # Jan: deep winter, worst month
            ('anxious', 0.09, 11),  # Nov: seasonal spiral begins
            ('happy',   0.09, 5),   # May: spring, things feel possible
            ('calm',    0.06, 6),   # Jun: summer warmth
        ],
        'weekday': {
            #              Mon   Tue   Wed   Thu   Fri   Sat   Sun
            'anxious':  [1.00, 1.00, 0.95, 0.90, 0.95, 0.80, 1.25],  # Sunday dread
            'sad':      [1.00, 0.95, 0.90, 0.90, 0.95, 0.80, 1.20],
            'happy':    [0.95, 1.00, 1.05, 1.10, 1.10, 1.25, 0.85],  # Fri/Sat best
        },
        'notes': [
            "Couldn't explain why but everything felt heavy today",
            "A song made me cry on the subway. Worth it.",
            "Feeling out of place in my own life",
            "Had a conversation that actually meant something",
            "The world is so beautiful it physically hurts",
            "What is the point of any of this",
            "Someone understood me today. Completely. First time in a while.",
            "Been thinking about that thing I said three years ago",
            "Feeling invisible, which is somehow different from being alone",
            "Everything felt aligned today — rare and precious",
            "The gap between who I am and who I want to be felt very large",
            "Found a book that felt written for me specifically",
            "Spent the day in my own world and it was perfect",
            "Cried for no reason but it felt important",
            "Someone's pain became my pain today. Didn't ask for it.",
            "The kind of sad that's almost beautiful",
        ],
    },

    'INTJ': {
        'tagline': 'The Architect — has a plan, executing the plan, mildly irritated by your plan',
        #                      exc   hap   calm  anx   sad   ang
        'base_weights':       [0.10, 0.10, 0.40, 0.12, 0.12, 0.16],
        'intensity_mean': 5.3, 'intensity_std': 1.5,
        'log_rate': 0.91,   # systematic; treats journaling like a KPI
        'seasonal': [
            ('angry', 0.08, 10),  # Oct/Nov: Q4 planning = maximum bureaucratic frustration
            ('angry', 0.06, 3),   # Mar: Q1 review season, equally painful
            ('calm',  0.06, 7),   # Jul: summer, fewer people, maximum calm
        ],
        'weekday': {
            #              Mon   Tue   Wed   Thu   Fri   Sat   Sun
            'angry':    [0.90, 1.05, 1.10, 1.10, 1.10, 0.70, 0.70],  # weekdays = people
            'calm':     [1.00, 0.95, 0.95, 0.95, 0.95, 1.20, 1.25],
            'excited':  [1.10, 1.05, 1.00, 1.00, 0.90, 0.95, 1.10],  # Mon: new plans
        },
        'notes': [
            "The system is working exactly as designed",
            "Three inefficiencies identified, two resolved",
            "Why would you do it that way",
            "Execution was clean. Satisfied.",
            "That meeting could have been an email",
            "Made significant progress on the long-term plan",
            "Predicted this outcome six weeks ago",
            "Built a framework for a problem that probably doesn't exist yet. Worth it.",
            "Someone described me as intimidating. I took it as a compliment.",
            "Quiet day. Processed a lot.",
            "Everything is working. Suspicious.",
            "Identified the pattern. Now I know what to expect.",
            "Unnecessary complexity everywhere. Simplified three things.",
            "Read two papers and restructured my approach. Good Sunday.",
            "The plan held. It always holds if you make the plan correctly.",
        ],
    },

    'ESFJ': {
        'tagline': 'The Consul — powered by connection, notices when you haven\'t eaten',
        #                      exc   hap   calm  anx   sad   ang
        'base_weights':       [0.13, 0.36, 0.26, 0.16, 0.07, 0.02],
        'intensity_mean': 6.4, 'intensity_std': 1.3,
        'log_rate': 0.83,
        'seasonal': [
            ('happy',   0.09, 12),  # Dec: holiday season, people everywhere
            ('happy',   0.06, 6),   # Jun: summer social peak
            ('anxious', 0.06, 9),   # Sep: back-to-routine, everyone needs things
        ],
        'weekday': {
            #              Mon   Tue   Wed   Thu   Fri   Sat   Sun
            'happy':    [0.88, 0.92, 1.00, 1.00, 1.12, 1.28, 1.22],  # weekends = people
            'anxious':  [1.15, 1.05, 0.95, 0.90, 0.85, 0.78, 0.82],
            'calm':     [0.90, 0.95, 1.00, 1.05, 1.05, 1.15, 1.18],
        },
        'notes': [
            "Lunch with the team. Everyone seemed happy.",
            "Remembered everyone's coffee order. It matters.",
            "Helped someone today and it felt exactly right",
            "The vibe was off and I don't know why",
            "Family dinner was everything",
            "Someone was struggling and I could tell before they said anything",
            "Made sure everyone felt included today",
            "The party came together perfectly",
            "Group energy was high today — fed off it all day",
            "Felt disconnected from the people around me. Uncomfortable.",
            "Organized the birthday thing. Worth every minute.",
            "Someone said thank you and I had to pretend that's not all I needed",
            "Held the group together when it was falling apart",
            "Good conversation. The real kind.",
            "Everyone left happy. That's enough.",
        ],
    },

    'ENFP': {
        'tagline': 'The Campaigner — optimistic, scattered, seventeen tabs open including this one',
        #                      exc   hap   calm  anx   sad   ang
        'base_weights':       [0.28, 0.25, 0.08, 0.25, 0.10, 0.04],
        'intensity_mean': 7.6, 'intensity_std': 2.1,
        'log_rate': 0.69,   # forgets sometimes; also: ran out of battery
        'seasonal': [
            ('excited', 0.11, 4),   # Apr: spring = new projects, new people
            ('happy',   0.07, 6),   # Jun: summer optimism peak
            ('anxious', 0.09, 10),  # Oct: the fall spiral
            ('sad',     0.06, 1),   # Jan: post-holiday crash
        ],
        'weekday': {
            #              Mon   Tue   Wed   Thu   Fri   Sat   Sun
            'excited':  [0.85, 1.00, 1.08, 1.12, 1.10, 1.15, 1.08],
            'anxious':  [1.00, 0.95, 0.90, 0.90, 0.88, 0.82, 1.28],  # Sunday spiral
            'happy':    [0.90, 1.00, 1.05, 1.08, 1.12, 1.18, 0.95],
        },
        'notes': [
            "Everything is possible today",
            "Spiral at 2am. Fine now.",
            "Met someone who changed how I see everything",
            "Why am I like this",
            "The future is so full of things",
            "Cried and I'm not sure why but it felt cleansing",
            "Made three people laugh on purpose",
            "Got so excited about an idea I forgot to eat",
            "The anxiety was loud today",
            "I love people. I love the world. I need to be alone now.",
            "Started something new. It's going to be different this time.",
            "Overthought everything and then it worked out anyway",
            "Had a Big Feeling and don't know what to do with it",
            "The world is full of possibilities and that is somehow terrifying",
            "Energy was everywhere today. Possibly too much.",
            "Talked about the idea so much I might not actually build it",
        ],
    },

    'ISTP': {
        'tagline': 'The Virtuoso — competent, quiet, already fixed the thing you\'re complaining about',
        #                      exc   hap   calm  anx   sad   ang
        'base_weights':       [0.08, 0.14, 0.48, 0.12, 0.12, 0.06],
        'intensity_mean': 4.1, 'intensity_std': 1.4,
        'log_rate': 0.61,   # logs when something actually noteworthy happens
        'seasonal': [
            ('excited', 0.07, 8),   # Aug: outdoor projects, motorcycles, etc.
            ('calm',    0.06, 7),   # Jul: summer rhythm
            ('sad',     0.05, 2),   # Feb: nothing to fix, nothing to build
        ],
        'weekday': {
            #              Mon   Tue   Wed   Thu   Fri   Sat   Sun
            'calm':     [0.95, 1.00, 1.00, 1.00, 1.00, 1.12, 1.18],
            'excited':  [0.85, 0.95, 1.00, 1.00, 1.00, 1.28, 1.25],  # weekend projects
            'angry':    [1.20, 1.10, 1.00, 1.00, 1.00, 0.70, 0.70],  # Mon meetings
        },
        'notes': [
            "Fixed it",
            "Problem solved",
            "Good day. Hands-on.",
            "Nobody asked for my opinion so I kept it",
            "Made something work that shouldn't work",
            "Quiet. Good.",
            "Long drive. Needed it.",
            "People were loud. That was their problem.",
            "Built the thing. Works.",
            "Figured it out without asking for help",
            "Fine",
            "Took something apart. Understood it. Put it back better.",
            "Efficient day",
            "Solved three things before anyone else noticed there was a problem",
            "No words necessary",
        ],
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# GENERATION LOGIC
# ─────────────────────────────────────────────────────────────────────────────

def seasonal_mod(month, amplitude, peak_month):
    """Sine curve peaking at peak_month, bottoming 6 months away."""
    angle = 2 * math.pi * (month - peak_month) / 12
    return 1.0 + amplitude * math.cos(angle)


def life_wave(day_of_year, wave_seed, period=35, amplitude=0.04):
    """Slow sine giving multi-week 'good stretch / rough stretch' cycles."""
    angle = 2 * math.pi * day_of_year / period + wave_seed
    return 1.0 + amplitude * math.sin(angle)


def adjusted_weights(profile, d, rng):
    weights = list(profile['base_weights'])
    month   = d.month
    dow     = d.weekday()           # Python: 0=Mon … 6=Sun
    doy     = d.timetuple().tm_yday

    # Seasonal
    for emotion, amp, peak in profile.get('seasonal', []):
        if emotion in IDX:
            weights[IDX[emotion]] *= seasonal_mod(month, amp, peak)

    # Weekday
    for emotion, mods in profile.get('weekday', {}).items():
        if emotion in IDX:
            weights[IDX[emotion]] *= mods[dow]

    # Life wave — different phase offset per emotion to avoid lockstep
    for i in range(len(weights)):
        weights[i] *= life_wave(doy, wave_seed=i * 1.47 + rng.random() * 0.1)

    # Clamp + normalise
    weights = [max(0.01, w) for w in weights]
    total   = sum(weights)
    return [w / total for w in weights]


def make_timestamp(d):
    """Return Unix ms timestamp for noon on the given date."""
    dt = datetime(d.year, d.month, d.day, 12, 0, 0)
    return int(dt.timestamp() * 1000)


def generate_year(profile, year, seed):
    rng     = random.Random(seed)
    entries = {}
    cur     = date(year, 1, 1)
    end     = date(year, 12, 31)

    while cur <= end:
        if rng.random() > profile['log_rate']:
            cur += timedelta(days=1)
            continue

        w         = adjusted_weights(profile, cur, rng)
        emotion   = rng.choices(EMOTIONS, weights=w)[0]
        intensity = max(1, min(10, round(rng.gauss(
            profile['intensity_mean'], profile['intensity_std']
        ))))
        note      = rng.choice(profile['notes']) if rng.random() < 0.42 else ''
        ts        = make_timestamp(cur)

        entries[cur.isoformat()] = {
            'emotion':   emotion,
            'intensity': intensity,
            'note':      note,
            'createdAt': ts,
            'updatedAt': ts,
        }
        cur += timedelta(days=1)

    return entries


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def summarise(entries, name, tagline):
    total  = len(entries)
    counts = {e: 0 for e in EMOTIONS}
    for v in entries.values():
        counts[v['emotion']] += 1

    top = sorted(counts.items(), key=lambda x: -x[1])
    print(f'\n  {name}  —  {tagline}')
    print(f'  {total} days logged')
    for emotion, n in top:
        bar = '█' * round(n / total * 30)
        print(f'    {emotion:8s}  {bar}  {round(n/total*100):2d}%')


def main():
    os.makedirs('mock_data', exist_ok=True)
    years = [2024, 2025]

    print('Generating mock data...')

    for name, profile in PROFILES.items():
        all_entries = {}
        for year in years:
            seed = (hash(name) ^ (year * 2654435761)) & 0xFFFFFFFF
            all_entries.update(generate_year(profile, year, seed))

        payload = {
            'version':   1,
            'profile':   f'{name} — {profile["tagline"]}',
            'generated': '2026-06-09',
            'entries':   dict(sorted(all_entries.items())),
        }

        path = os.path.join('mock_data', f'moodmap-{name}.json')
        with open(path, 'w') as f:
            json.dump(payload, f, indent=2)

        summarise(all_entries, name, profile['tagline'])

    print(f'\nFiles written to mock_data/')
    print('Import any file via the ↑ Import button in moodmap,')
    print('then navigate to 2024 or 2025 with the ← arrow.')


if __name__ == '__main__':
    main()
