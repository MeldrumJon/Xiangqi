function localStorageAvailable() {
    try {
        let storage = window.localStorage;
        let x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}

class Storage {
    constructor() { this.store = {}; }
    setItem(key, value) { this.store[key] = value; }
    getItem(key) { return this.store[key]; }
}

let store;
if (localStorageAvailable()) {
    store = window.localStorage;
}
else {
    store = new Storage();
}

export function setItem(key, string) {
    store.setItem(key, string);
}

export function getItem(key) {
    return store.getItem(key);
}

