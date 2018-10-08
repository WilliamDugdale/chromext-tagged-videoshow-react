let controlTimeout;
let controlsTimingOut = false;
let video = document.getElementsByTagName("video")[0];
let linkToOriginal = document.getElementById("linkToOriginal");
let activeLinker = null;

document.onkeydown = checkKey;

function changeSrc(url)
{
  video.src = url;
}

function updateLink(url)
{
    if (activeLinker !== null)
    {
        linkToOriginal.removeEventListener('click', activeLinker);
    }
    let linkDirector = function ()
    {
        video.pause();
        chrome.windows.create({url: url, incognito: true});
    }
    activeLinker = linkDirector;
    linkToOriginal.addEventListener('click', linkDirector);
}

function checkKey(e) {
    var video = document.getElementsByTagName("video")[0];
    e = e || window.event;

    if (e.keyCode == '38') {
        // up arrow
        video.volume = Math.min((video.volume + 0.1), 1);
    }
    else if (e.keyCode == '40') {
        // down arrow
        video.volume = Math.max((video.volume - 0.1), 0);
    }
    else if (e.keyCode == '37') {
        // left arrow
        video.controls = true;
        video.currentTime = Math.max((video.currentTime - 5), 0);
    }
    else if (e.keyCode == '39') {
       // right arrow
       video.controls = true;
       video.currentTime = Math.min((video.currentTime + 5), video.duration - 2);
    }
}

chrome.storage.sync.get('flattenedURLs', function (storageObject)
{
    play(storageObject.flattenedURLs);
});

function play(flattenedURLs)
{
    chrome.tabs.getCurrent(function (tab) {
        let playlistHelper = 
        {
            remainingVideos: flattenedURLs,
            nextSrc: null,
            masterTabId: tab.id
        };
        document.getElementsByTagName("video")[0].addEventListener("ended", function () {
            playNext(playlistHelper);
        });
        document.getElementsByTagName("video")[0].addEventListener("loadeddata", function () {
            prepNextSrcUrl(playlistHelper);
        });
        createBackgroundWindowAndGo(playlistHelper, true)
    });
}

function createBackgroundWindowAndGo(playlistHelper, initiate = false)
{
    chrome.windows.create({state: "minimized", incognito: true}, function (window) {
        chrome.tabs.update(playlistHelper.masterTabId, {active: true}, function () {
            playlistHelper.backgroundTabId = window.tabs[0].id;
            playlistHelper.playLocked = true;
            playlistHelper.prepLocked = false;
            chrome.runtime.sendMessage({masterTabId: playlistHelper.masterTabId, newTabId: window.tabs[0].id}, function (response) {
                if (response.acknowledged)
                {
                    prepNextSrcUrl(playlistHelper, false);
                    if (initiate)
                    {
                        playNext(playlistHelper);
                    }
                }
            });
        });
    });
}

function prepNextSrcUrl(playlistHelper, respectLock = true)
{
    if (respectLock && playlistHelper.prepLocked)
    {
        setTimeout(function () {prepNextSrcUrl(playlistHelper);}, 1000);
    }
    else if (playlistHelper.remainingVideos.length > 0)
    {   
        playlistHelper.prepLocked = true;
        playlistHelper.playLocked = true;
        getSrcFromSite(playlistHelper);
    }
    else
    {
        playlistHelper.prepLocked = false;
        playlistHelper.playLocked = false;
        playlistHelper.nextSrc = null;
    }
}

function getSrcFromSite(playlistHelper)
{
    backgroundTabId = playlistHelper.backgroundTabId;
    chrome.tabs.get(backgroundTabId, function (tab) {
        if (chrome.runtime.lastError)
        {
            createBackgroundWindowAndGo(playlistHelper);
        }
        else
        {
            nextVideo = playlistHelper.remainingVideos[(playlistHelper.remainingVideos.length - 1)];
            let listener = listenerWrapper(nextVideo, backgroundTabId, playlistHelper);
            chrome.tabs.onUpdated.addListener(listener);
            chrome.tabs.onRemoved.addListener(function (tab) {
                if (tab.id == backgroundTabId)
                {
                    playlistHelper.prepLocked = false;
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            });
            chrome.tabs.update(backgroundTabId, {url: nextVideo.url, active: false, muted: true});
        }
    });
}

function listenerWrapper(nextVideo, backgroundTabId, playlistHelper)
{
    function listener(updatedTabId, info)
    {
        if (info.status === 'complete' && updatedTabId === backgroundTabId) {
            chrome.tabs.executeScript(updatedTabId, {
                code: nextVideo.code
            }, function (result) {
                chrome.tabs.onUpdated.removeListener(listener);
                nextVideo = playlistHelper.remainingVideos.pop();
                if (result && result[0])
                {
                    playlistHelper.nextSrc = result[0];
                    playlistHelper.nextOriginalURL = nextVideo.url;
                    playlistHelper.playLocked = false;
                    playlistHelper.prepLocked = false;
                    chrome.tabs.remove(backgroundTabId);
                }
                else
                {
                    console.log('Possibly deleted: ' + nextVideo.url);
                    prepNextSrcUrl(playlistHelper, false);
                }
            });
        }
    }
    return listener;
}

function playNext(playlistHelper)
{
    if (playlistHelper.playLocked)
    {
        chrome.tabs.get(playlistHelper.backgroundTabId, function (tab) {
            if (chrome.runtime.lastError)
            {
                createBackgroundWindowAndGo(playlistHelper);
            }
        });
        setTimeout(function () {playNext(playlistHelper);}, 1000);
    }
    else if (playlistHelper.nextSrc)
    {
        updateLink(playlistHelper.nextOriginalURL);
        changeSrc(playlistHelper.nextSrc);
    }
    else
    {
        chrome.tabs.remove(playlistHelper.masterTabId);
    }
}