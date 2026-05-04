const WAVE_COMPOSITIONS = [
    {
        name: 'Shield Push',
        units: [{ type: 'tank', count: 1 }, { type: 'archer', count: 2 }, { type: 'swordsman', count: 2 }],
        minTime: 10,
    },
    {
        name: 'Arcane Spear',
        units: [{ type: 'giant', count: 1 }, { type: 'mage', count: 2 }, { type: 'archer', count: 1 }],
        minTime: 30,
    },
    {
        name: 'Shadow Flank',
        units: [{ type: 'assassin', count: 3 }, { type: 'necromancer', count: 1 }, { type: 'swordsman', count: 2 }],
        minTime: 40,
    },
    {
        name: 'Siege Breaker',
        units: [{ type: 'giant', count: 2 }, { type: 'supreme', count: 1 }, { type: 'mage', count: 1 }],
        minTime: 60,
    },
    {
        name: 'Undead Horde',
        units: [{ type: 'necromancer', count: 2 }, { type: 'giant', count: 1 }, { type: 'swordsman', count: 3 }],
        minTime: 50,
    },
    {
        name: 'Quick Rush',
        units: [{ type: 'swordsman', count: 4 }, { type: 'archer', count: 2 }],
        minTime: 5,
    },
];

export function getWaveCompositions() {
    return WAVE_COMPOSITIONS;
}

export function calcWaveCost(comp, unitRegistry) {
    let total = 0;
    for (const u of comp.units) {
        const cls = unitRegistry.get(u.type);
        total += (cls ? cls.STATS.cost : 50) * u.count;
    }
    return total;
}

export function flattenWaveUnits(comp) {
    const list = [];
    for (const u of comp.units) {
        for (let i = 0; i < u.count; i++) {
            list.push(u.type);
        }
    }
    return list;
}
