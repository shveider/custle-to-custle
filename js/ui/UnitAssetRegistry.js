const SVG_CACHE = {};

function getUnitSVG(type, owner) {
    const cacheKey = type + '_' + owner;
    if (SVG_CACHE[cacheKey]) return SVG_CACHE[cacheKey];

    const accentP = owner === 'ai' ? '#e84858' : '#4a9eff';
    const skinTone = '#d4a574';
    const darkSkin = '#b8895a';
    const metal = '#8899aa';
    const darkMetal = '#667788';
    const gold = '#d4a020';

    let svg;
    switch (type) {
        case 'swordsman':
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="16" width="16" height="20" rx="3" fill="#5a6575"/><rect x="20" y="18" width="12" height="16" rx="2" fill="#6a7585"/><circle cx="26" cy="12" r="7" fill="${skinTone}"/><rect x="19" y="7" width="14" height="6" rx="2" fill="${metal}"/><rect x="21" y="5" width="10" height="3" rx="1" fill="${accentP}"/><circle cx="23" cy="11" r="1.2" fill="#222"/><circle cx="29" cy="11" r="1.2" fill="#222"/><rect x="12" y="22" width="6" height="18" rx="2" fill="${metal}"/><rect x="12" y="22" width="6" height="4" rx="1" fill="${accentP}"/><rect x="34" y="20" width="5" height="22" rx="1.5" fill="${darkMetal}"/><polygon points="36,14 39,20 33,20" fill="${metal}"/><rect x="18" y="36" width="7" height="10" rx="2" fill="#4a5565"/><rect x="27" y="36" width="7" height="10" rx="2" fill="#4a5565"/></svg>`;
            break;
        case 'archer':
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="17" width="14" height="18" rx="3" fill="#5a4a30"/><rect x="21" y="19" width="10" height="14" rx="2" fill="#6a5a40"/><circle cx="26" cy="13" r="7" fill="${skinTone}"/><path d="M19,11 Q26,6 33,11" fill="none" stroke="#4a3a20" stroke-width="2"/><rect x="20" y="9" width="12" height="3" rx="1" fill="#3a6a30"/><circle cx="23" cy="12" r="1.2" fill="#222"/><circle cx="29" cy="12" r="1.2" fill="#222"/><path d="M8,8 Q4,26 8,44" fill="none" stroke="#8a6a30" stroke-width="2.5"/><line x1="8" y1="8" x2="8" y2="44" stroke="#c8a060" stroke-width="1" opacity="0.6"/><rect x="34" y="18" width="4" height="14" rx="1.5" fill="${darkSkin}"/><polygon points="38,16 42,20 34,20" fill="#c8a060"/><rect x="19" y="35" width="6" height="11" rx="2" fill="#4a3a25"/><rect x="27" y="35" width="6" height="11" rx="2" fill="#4a3a25"/></svg>`;
            break;
        case 'mage':
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><path d="M18,18 L16,38 L36,38 L34,18 Z" fill="#3a3a80"/><path d="M20,20 L19,36 L33,36 L32,20 Z" fill="#4848a0"/><circle cx="26" cy="14" r="7" fill="${skinTone}"/><path d="M18,12 L26,4 L34,12 Z" fill="#4a4aa0"/><circle cx="26" cy="8" r="2.5" fill="${accentP}" opacity="0.8"/><circle cx="23" cy="13" r="1.2" fill="#222"/><circle cx="29" cy="13" r="1.2" fill="#222"/><rect x="35" y="14" width="4" height="24" rx="2" fill="#6a5a30"/><circle cx="37" cy="12" r="4" fill="${accentP}" opacity="0.6"/><circle cx="37" cy="12" r="2" fill="#ffffff" opacity="0.8"/><rect x="19" y="38" width="6" height="9" rx="2" fill="#2a2a60"/><rect x="27" y="38" width="6" height="9" rx="2" fill="#2a2a60"/></svg>`;
            break;
        case 'supreme':
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="16" width="20" height="22" rx="3" fill="#4a2080"/><rect x="18" y="18" width="16" height="18" rx="2" fill="#5a30a0"/><path d="M22,22 L30,22 L28,30 L24,30 Z" fill="${gold}"/><circle cx="26" cy="12" r="7" fill="${skinTone}"/><path d="M17,10 L26,2 L35,10 Z" fill="#6a40c0"/><rect x="22" y="4" width="8" height="3" rx="1" fill="${accentP}"/><circle cx="23" cy="11" r="1.2" fill="#6a00ff"/><circle cx="29" cy="11" r="1.2" fill="#6a00ff"/><rect x="10" y="20" width="6" height="20" rx="2" fill="#5a40b0"/><circle cx="13" cy="18" r="4" fill="${accentP}" opacity="0.7"/><rect x="36" y="16" width="5" height="18" rx="1.5" fill="${darkMetal}"/><polygon points="38,10 42,16 34,16" fill="#8a60e0"/><rect x="17" y="38" width="8" height="10" rx="2" fill="#3a1860"/><rect x="27" y="38" width="8" height="10" rx="2" fill="#3a1860"/></svg>`;
            break;
        case 'hero':
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="16" width="20" height="22" rx="3" fill="#8a7020"/><rect x="18" y="18" width="16" height="18" rx="2" fill="#a08030"/><path d="M20,20 L32,20 L30,28 L22,28 Z" fill="${gold}"/><circle cx="26" cy="12" r="7.5" fill="${skinTone}"/><path d="M17,8 L26,1 L35,8 Z" fill="${gold}"/><rect x="20" y="3" width="12" height="3" rx="1" fill="${accentP}"/><circle cx="22" cy="11" r="1.3" fill="#222"/><circle cx="30" cy="11" r="1.3" fill="#222"/><path d="M24,14 L28,14 L26,16 Z" fill="${darkSkin}"/><rect x="8" y="18" width="7" height="22" rx="2.5" fill="${metal}"/><rect x="8" y="18" width="7" height="5" rx="1" fill="${accentP}"/><rect x="36" y="14" width="5" height="26" rx="1.5" fill="${darkMetal}"/><polygon points="38,8 42,14 34,14" fill="${gold}"/><circle cx="38" cy="10" r="2" fill="#fff" opacity="0.6"/><rect x="17" y="38" width="8" height="10" rx="2" fill="#6a5518"/><rect x="27" y="38" width="8" height="10" rx="2" fill="#6a5518"/><circle cx="26" cy="6" r="1.5" fill="#ffd700" opacity="0.9"/></svg>`;
            break;
        case 'tank':
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="14" width="24" height="24" rx="4" fill="#4a4a55"/><rect x="16" y="16" width="20" height="20" rx="3" fill="#5a5a65"/><rect x="20" y="20" width="12" height="12" rx="2" fill="#6a6a75"/><circle cx="26" cy="10" r="8" fill="#5a5a65"/><rect x="18" y="4" width="16" height="7" rx="2" fill="#6a6a75"/><rect x="20" y="2" width="12" height="4" rx="1" fill="${accentP}"/><circle cx="22" cy="9" r="1.5" fill="#ff4444"/><circle cx="30" cy="9" r="1.5" fill="#ff4444"/><rect x="8" y="18" width="8" height="22" rx="3" fill="#4a4a55"/><rect x="8" y="18" width="8" height="6" rx="2" fill="${accentP}"/><rect x="36" y="16" width="8" height="24" rx="3" fill="#4a4a55"/><rect x="36" y="16" width="8" height="6" rx="2" fill="${accentP}"/><rect x="16" y="38" width="10" height="10" rx="3" fill="#3a3a45"/><rect x="26" y="38" width="10" height="10" rx="3" fill="#3a3a45"/></svg>`;
            break;
        case 'assassin':
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="17" width="16" height="18" rx="3" fill="#3a2030"/><rect x="20" y="19" width="12" height="14" rx="2" fill="#4a2a3a"/><circle cx="26" cy="13" r="7" fill="${skinTone}"/><path d="M19,10 Q26,7 33,10 L34,14 L18,14 Z" fill="#2a1828"/><rect x="20" y="12" width="12" height="3" rx="1" fill="#1a1020"/><circle cx="23" cy="13" r="1.2" fill="#ff4060"/><circle cx="29" cy="13" r="1.2" fill="#ff4060"/><rect x="10" y="22" width="4" height="18" rx="1.5" fill="#2a1828"/><polygon points="12,18 15,22 9,22" fill="#c0c8d0"/><rect x="36" y="20" width="4" height="16" rx="1.5" fill="#2a1828"/><polygon points="38,16 41,20 35,20" fill="#c0c8d0"/><rect x="19" y="35" width="6" height="11" rx="2" fill="#2a1828"/><rect x="27" y="35" width="6" height="11" rx="2" fill="#2a1828"/></svg>`;
            break;
        case 'necromancer':
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><path d="M16,18 L14,40 L38,40 L36,18 Z" fill="#2a1040"/><path d="M18,20 L17,38 L35,38 L34,20 Z" fill="#3a1858"/><circle cx="26" cy="14" r="7" fill="#c0b0a0"/><path d="M18,10 L26,3 L34,10 Z" fill="#2a1040"/><circle cx="26" cy="8" r="2" fill="#80ff80" opacity="0.7"/><circle cx="23" cy="13" r="1.5" fill="#00ff00"/><circle cx="29" cy="13" r="1.5" fill="#00ff00"/><rect x="35" y="12" width="4" height="26" rx="2" fill="#4a3060"/><circle cx="37" cy="10" r="4" fill="#80ff80" opacity="0.5"/><circle cx="37" cy="10" r="2" fill="#ffffff" opacity="0.7"/><rect x="19" y="40" width="6" height="8" rx="2" fill="#1a0830"/><rect x="27" y="40" width="6" height="8" rx="2" fill="#1a0830"/><circle cx="14" cy="30" r="3" fill="#40ff40" opacity="0.3"/><circle cx="40" cy="28" r="2.5" fill="#40ff40" opacity="0.25"/></svg>`;
            break;
        case 'giant':
            svg = `<svg viewBox="0 0 62 62" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="18" width="22" height="26" rx="4" fill="#6a5040"/><rect x="22" y="20" width="18" height="22" rx="3" fill="#7a6050"/><rect x="26" y="26" width="10" height="10" rx="2" fill="#8a7060"/><circle cx="31" cy="13" r="10" fill="#7a6050"/><rect x="23" y="5" width="16" height="9" rx="3" fill="#6a5040"/><circle cx="27" cy="12" r="2" fill="#ff6040"/><circle cx="35" cy="12" r="2" fill="#ff6040"/><path d="M27,16 L35,16 L31,19 Z" fill="#5a4030"/><rect x="10" y="20" width="10" height="26" rx="4" fill="#6a5040"/><rect x="10" y="20" width="10" height="8" rx="3" fill="${accentP}"/><rect x="42" y="18" width="10" height="28" rx="4" fill="#6a5040"/><rect x="42" y="18" width="10" height="8" rx="3" fill="${accentP}"/><rect x="20" y="44" width="10" height="14" rx="4" fill="#5a4030"/><rect x="32" y="44" width="10" height="14" rx="4" fill="#5a4030"/></svg>`;
            break;
        case 'skeleton':
            svg = `<svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="12" width="14" height="16" rx="2" fill="#c8c0b8"/><circle cx="19" cy="8" r="6" fill="#d8d0c8"/><circle cx="16" cy="7" r="1.5" fill="#222"/><circle cx="22" cy="7" r="1.5" fill="#222"/><rect x="17" y="10" width="4" height="2" rx="1" fill="#222"/><rect x="6" y="14" width="6" height="14" rx="2" fill="#c8c0b8"/><rect x="26" y="14" width="6" height="14" rx="2" fill="#c8c0b8"/><rect x="12" y="28" width="6" height="8" rx="2" fill="#b8b0a8"/><rect x="20" y="28" width="6" height="8" rx="2" fill="#b8b0a8"/></svg>`;
            break;
        case 'healer':
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="17" y="16" width="18" height="20" rx="3" fill="#4a7a5a"/><rect x="19" y="18" width="14" height="16" rx="2" fill="#5a8a6a"/><circle cx="26" cy="12" r="7" fill="${skinTone}"/><path d="M18,10 Q26,4 34,10" fill="#e8f8e8"/><circle cx="23" cy="11" r="1.2" fill="#222"/><circle cx="29" cy="11" r="1.2" fill="#222"/><rect x="10" y="18" width="5" height="26" rx="2" fill="#4a8a5a"/><rect x="10" y="18" width="5" height="6" rx="1" fill="${accentP}"/><polygon points="13,14 16,18 10,18" fill="#6a9a7a"/><rect x="37" y="18" width="5" height="26" rx="2" fill="#4a8a5a"/><polygon points="39,14 42,18 36,18" fill="#6a9a7a"/><rect x="18" y="36" width="7" height="10" rx="2" fill="#3a6a4a"/><rect x="27" y="36" width="7" height="10" rx="2" fill="#3a6a4a"/><circle cx="26" cy="8" r="2" fill="#00ff88" opacity="0.6"/></svg>`;
            break;
        default:
            svg = `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="26" r="20" fill="${accentP}"/></svg>`;
    }

    SVG_CACHE[cacheKey] = svg;
    return svg;
}

export class UnitAssetRegistry {
    getSVG(unitKey, owner) {
        return getUnitSVG(unitKey, owner);
    }

    getIcon(unitKey) {
        const UnitClass = this._getUnitClass(unitKey);
        return UnitClass?.STATS?.icon || '❓';
    }

    getDisplayName(unitKey) {
        const UnitClass = this._getUnitClass(unitKey);
        return UnitClass?.STATS?.displayName || unitKey;
    }

    _getUnitClass(unitKey) {
        if (!this._unitRegistry) return null;
        return this._unitRegistry.get(unitKey) || null;
    }

    setUnitRegistry(unitRegistry) {
        this._unitRegistry = unitRegistry;
    }
}
