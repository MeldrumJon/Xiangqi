/*
 * Page Title
 */

let pageTitle = document.title;

export function setTitle(title) {
    pageTitle = title;
    document.title = title;
}

export function flashTitle(msg) {
    if (document.hasFocus()) { return; }
    let toggle = function() {
        document.title = (document.title === pageTitle) ? msg : pageTitle;
    }
    let id = window.setInterval(toggle, 1000);

    let clear = function() {
        window.removeEventListener('focus', clear);
        window.clearInterval(id);
        document.title = pageTitle;
    }
    window.addEventListener('focus', clear);
}

/*
 * Push Notifications
 */

export function pushAsk(callback) {
    function checkNotificationPromise() {
        try {
            Notification.requestPermission().then();
        } catch {
            return false;
        }
        return true;
    }

    function handlePermission(permission) {
        if(!('permission' in Notification)) {
            Notification.permission = permission;
        }
        callback(permission);
    }

    // Let's check if the browser supports notifications
    if (!"Notification" in window) {
        console.log("This browser does not support notifications.");
    } else {
        if (checkNotificationPromise()) {
            Notification.requestPermission()
            .then(function (permission) {
                handlePermission(permission);
            })
        } else {
            Notification.requestPermission(function(permission) {
                handlePermission(permission);
            });
        }
    }
}

export function pushStatus() {
    if (!('Notification' in window)) {
        return 'denied';
    }
    return Notification.permission;
}

export function pushNotify(title, body) {
    let obj;
    if (body) {
        obj = {body: body};
    }
    return new Notification(title, obj);
}

/*
 * Sounds
 */

export function playSound(snd) {
    snd.currentTime = 0;
    snd.play();
}
