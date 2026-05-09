"use strict";
export class EventBanner {
    constructor() {
        this._active = null;
    }

    show(title, message, duration = 3000) {
        if (this._active) {
            this._active.remove();
            this._active = null;
        }

        const banner = document.createElement('div');
        banner.className = 'event-banner';
        banner.innerHTML = '<div class="event-banner-title">' + title + '</div><div class="event-banner-msg">' + message + '</div>';
        document.body.appendChild(banner);
        this._active = banner;

        setTimeout(() => {
            if (banner.parentNode) banner.parentNode.removeChild(banner);
            if (this._active === banner) this._active = null;
        }, duration);
    }
}
