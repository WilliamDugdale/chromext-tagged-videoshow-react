chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.newTabId)
      {
        chrome.tabs.onRemoved.addListener(killChildOnRemovalFactory(request.masterTabId, request.newTabId));
        chrome.tabs.onUpdated.addListener(killChildOnURLUpdateFactory(request.masterTabId, request.newTabId));
        sendResponse({acknowledged: true});
      }
    });

function killChildOnRemovalFactory(masterTabId, childTabId)
{
    function killChildOnRemoval(tabId)
    {
        if (tabId == masterTabId)
        {
            chrome.tabs.remove(childTabId, function () {
                if (chrome.runtime.lastError)
                {
                    
                }
            });
            chrome.tabs.onRemoved.removeListener(killChildOnRemoval);
        }
    }
    return killChildOnRemoval;
}

function killChildOnURLUpdateFactory(masterTabId, childTabId)
{
    function killChildOnURLUpdate(tabId, info)
    {
        if (tabId == masterTabId && info.url)
        {
            chrome.tabs.remove(childTabId, function () {
                if (chrome.runtime.lastError)
                {
                    
                }
            });
            chrome.tabs.onUpdated.removeListener(killChildOnURLUpdate);
        }
    }
    return killChildOnURLUpdate;
}