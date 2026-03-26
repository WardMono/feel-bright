/* /script/shared-stats.js - robust/shared stats updater
   - Defaults to credentials: 'include'
   - Exposes updateSiteStats, startStatsPolling, stopStatsPolling, debugFetchOnce
*/

(function (root) {
    'use strict';

    const STATS_ENDPOINT = '/admin/stats';
    const POLL_INTERVAL = 15000;
    const DEBUG = false; // set to true while debugging

    async function safeParse(resp) {
        if (!resp) return {};
        try { return await resp.json(); }
        catch (e1) {
            try { const t = await resp.text(); return JSON.parse(t || '{}'); }
            catch (e2) { return {}; }
        }
    }

    function $id(id) { return document.getElementById(id); }
    function setIf(id, value) {
        const el = $id(id);
        if (!el) return;
        el.textContent = String(value ?? el.textContent ?? '0');
    }

    function dig(obj, path) {
        if (!obj || !path) return undefined;
        return path.split('.').reduce((acc, p) => (acc && Object.prototype.hasOwnProperty.call(acc, p)) ? acc[p] : undefined, obj);
    }

    function pick(obj, keys = []) {
        for (const k of keys) {
            const v = k.includes('.') ? dig(obj, k) : (obj?.[k]);
            if (typeof v !== 'undefined' && v !== null) return v;
        }
        return undefined;
    }

    // try to infer online count from a users array returned with the stats endpoint
    function inferOnlineFromUsersArray(json) {
        try {
            const users = json.users || json.data || json.items || null;
            if (!Array.isArray(users) || users.length === 0) return undefined;

            // preferred approach: look for explicit flags
            let count = 0;
            for (const u of users) {
                if (typeof u.isOnline !== 'undefined') { if (u.isOnline) count++; continue; }
                if (typeof u.online !== 'undefined') { if (u.online) count++; continue; }
                // last_active fallback: treat as online if last_active within 2 minutes
                if (u.last_active) {
                    const diff = Date.now() - new Date(u.last_active).getTime();
                    if (Number.isFinite(diff) && diff >= 0 && diff < (2 * 60 * 1000)) count++;
                }
            }
            if (count > 0) return count;
        } catch (e) {
            if (DEBUG) console.debug('[shared-stats] inferOnlineFromUsersArray error', e);
        }
        return undefined;
    }

    async function updateSiteStats(archivedFromCaller = null, opts = {}) {
        const credentials = opts.credentials ?? 'include';
        const debug = opts.debug ?? DEBUG;

        if (archivedFromCaller !== null) {
            setIf('archivedCount', archivedFromCaller);
            if (debug) console.debug('[shared-stats] applied archivedFromCaller', archivedFromCaller);
        }

        try {
            const resp = await fetch(STATS_ENDPOINT, { cache: 'no-store', credentials });
            if (debug) console.debug('[shared-stats] fetch', STATS_ENDPOINT, 'status', resp.status, 'ok', resp.ok);

            if (!resp.ok) {
                if (debug) {
                    const text = await resp.text().catch(() => '');
                    console.warn('[shared-stats] non-ok response', resp.status, text);
                }
                return null;
            }

            const json = await safeParse(resp);
            if (debug) console.debug('[shared-stats] body', json);

            // try multiple candidate keys for online / active / archived
            const onlineVal = pick(json, [
                'online', 'onlineCount', 'online_users', 'online_users_count', 'stats.online', 'data.stats.online', 'counts.online'
            ]);
            const activeVal = pick(json, [
                'active', 'users', 'userCount', 'totalUsers', 'counts.active', 'stats.active', 'data.stats.active'
            ]);
            const archivedVal = pick(json, [
                'archived', 'archivedCount', 'totalArchived', 'archived_users_count', 'counts.archived', 'stats.archived'
            ]);

            // if online missing, try to infer from a returned users list
            let finalOnline = onlineVal;
            if (typeof finalOnline === 'undefined') {
                finalOnline = inferOnlineFromUsersArray(json);
                if (debug) console.debug('[shared-stats] inferred online from users array =>', finalOnline);
            }

            if (typeof finalOnline !== 'undefined') setIf('onlineCount', finalOnline);
            if (typeof activeVal !== 'undefined') setIf('totalCount', activeVal);

            // archived: only overwrite if caller didn't already set it
            if (archivedFromCaller === null && typeof archivedVal !== 'undefined') setIf('archivedCount', archivedVal);

            return json;
        } catch (err) {
            if (DEBUG || opts.debug) console.error('[shared-stats] update failed', err);
            return null;
        }
    }

    let _poll = null;
    function startStatsPolling(interval = POLL_INTERVAL, opts = {}) {
        stopStatsPolling();
        // immediate first update
        updateSiteStats(null, opts).catch(() => { });
        _poll = setInterval(() => updateSiteStats(null, opts), interval);
    }
    function stopStatsPolling() {
        if (_poll) { clearInterval(_poll); _poll = null; }
    }

    async function debugFetchOnce(opts = {}) {
        try {
            const credentials = opts.credentials ?? 'include';
            const resp = await fetch(STATS_ENDPOINT, { cache: 'no-store', credentials });
            const txt = await resp.text();
            let json;
            try { json = JSON.parse(txt); } catch (e) { json = txt; }
            console.log('[shared-stats debugFetchOnce] status', resp.status, 'ok', resp.ok, 'body:', json);
            return json;
        } catch (err) {
            console.error('[shared-stats debugFetchOnce] error', err);
            throw err;
        }
    }

    root.sharedStats = { updateSiteStats, startStatsPolling, stopStatsPolling, debugFetchOnce };

    if (DEBUG) console.debug('[shared-stats] loaded, window.sharedStats available');

    fetch('/admin/stats', { credentials: 'include', cache: 'no-store' })
        .then(async r => {
            console.log('status', r.status, 'ok', r.ok);
            const text = await r.text();
            try { console.log('json:', JSON.parse(text)); }
            catch (e) { console.log('body (text):', text); }
        })
        .catch(err => console.error('fetch error', err));


})(window);


